import mongoose from 'mongoose';
import DailyQuest, { DailyQuestType, IDailyQuest } from '../models/daily-quest.model';
import User from '../models/user.model';
import UserQuestLog from '../models/user-quest-log.model';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

/**
 * Gamification: streak + nhiệm vụ hằng ngày.
 *
 * Thiết kế:
 * - Định nghĩa quest nằm trong collection `dailyquests` (model DailyQuest) —
 *   sửa thưởng/tên/mục tiêu trong DB có hiệu lực ngay. Lần đọc đầu tiên nếu
 *   collection trống sẽ tự seed 3 quest mặc định (idempotent, upsert theo questId).
 * - Định nghĩa được cache in-memory 60s vì recordProgress() chạy trên MỌI
 *   tin nhắn chat — không để mỗi tin nhắn tốn thêm một query cấu hình.
 * - Tiến độ ghi vào UserQuestLog, unique theo (uid, questId, date).
 * - recordProgress() là best-effort: được gọi chen vào các nghiệp vụ chính
 *   (chat/quiz/đọc bối cảnh) nên KHÔNG BAO GIỜ được ném lỗi ra ngoài.
 * - Nhận thưởng: claim() dùng findOneAndUpdate có điều kiện làm chốt
 *   idempotency, cộng token bằng $inc (atomic — không read-modify-write).
 */

export type QuestType = DailyQuestType;

/** Seed mặc định — chỉ dùng khi collection dailyquests còn trống. */
const DEFAULT_QUESTS = [
  { questId: 'chat_once', type: 'CHAT' as const, title: 'Trò chuyện với một nhân vật lịch sử', target: 1, rewardTokens: 500, order: 1 },
  { questId: 'quiz_once', type: 'QUIZ' as const, title: 'Hoàn thành một quiz', target: 1, rewardTokens: 700, order: 2 },
  { questId: 'read_context', type: 'READ_CONTEXT' as const, title: 'Đọc một bối cảnh lịch sử', target: 1, rewardTokens: 300, order: 3 },
];

const DEFS_CACHE_TTL_MS = 60_000;
let defsCache: { defs: IDailyQuest[]; at: number } | null = null;

/** 'YYYY-MM-DD' theo giờ server (không dùng toISOString vì lệch UTC). */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayKey(d: Date = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

export interface TodayQuestItem {
  id: string;
  type: QuestType;
  title: string;
  target: number;
  rewardTokens: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface WeekDayItem {
  /** 'YYYY-MM-DD' */
  date: string;
  /** 0 = Thứ 2 ... 6 = Chủ nhật */
  weekday: number;
  studied: boolean;
  isToday: boolean;
}

export interface TodayResponse {
  date: string;
  streakCount: number;
  longestStreak: number;
  totalStudyDays: number;
  /** true nếu hôm nay đã có hoạt động (streak đã được tính cho hôm nay). */
  studiedToday: boolean;
  /** Tuần hiện tại (T2 → CN), ngày nào có hoạt động học. */
  week: WeekDayItem[];
  quests: TodayQuestItem[];
  /** Tổng token đang chờ nhận (đã hoàn thành nhưng chưa claim). */
  claimableTokens: number;
}

export class GamificationService {
  /**
   * Lấy danh sách quest đang bật từ DB (cache 60s).
   * Collection trống → seed bộ mặc định rồi đọc lại.
   */
  static async getQuestDefs(): Promise<IDailyQuest[]> {
    const now = Date.now();
    if (defsCache && now - defsCache.at < DEFS_CACHE_TTL_MS) return defsCache.defs;

    let defs = await DailyQuest.find({ isActive: true }).sort({ order: 1 });

    if (defs.length === 0) {
      // Upsert theo questId để hai instance khởi động song song không seed trùng
      await Promise.all(
        DEFAULT_QUESTS.map((q) =>
          DailyQuest.findOneAndUpdate(
            { questId: q.questId },
            { $setOnInsert: { ...q, isActive: true } },
            { upsert: true, setDefaultsOnInsert: true }
          )
        )
      );
      defs = await DailyQuest.find({ isActive: true }).sort({ order: 1 });
      logger.info('[gamification] Seeded default daily quests');
    }

    defsCache = { defs, at: now };
    return defs;
  }

  /** Xoá cache định nghĩa (gọi sau khi admin sửa quest, hoặc trong test). */
  static invalidateDefsCache(): void {
    defsCache = null;
  }

  /**
   * Ghi nhận một hành động cho quest tương ứng + cập nhật streak.
   * Best-effort: nuốt mọi lỗi (chỉ log) để không ảnh hưởng nghiệp vụ gọi nó.
   */
  static async recordProgress(userId: string, type: QuestType): Promise<void> {
    try {
      if (!mongoose.isValidObjectId(userId)) return;
      const defs = await GamificationService.getQuestDefs();
      const quest = defs.find((q) => q.type === type);
      if (!quest) return;

      const date = todayKey();
      const uid = new mongoose.Types.ObjectId(userId);

      await UserQuestLog.findOneAndUpdate(
        { uid, questId: quest.questId, date },
        { $inc: { progress: 1 } },
        { upsert: true, setDefaultsOnInsert: true }
      );

      await GamificationService.touchStreak(uid, date);
    } catch (err) {
      logger.error('[gamification] recordProgress failed', err);
    }
  }

  /**
   * Cập nhật streak khi có hoạt động học trong ngày:
   * - đã tính hôm nay rồi → thôi
   * - hôm qua có học → +1
   * - đứt quãng → reset về 1
   * Filter theo lastStudyDate cũ để hai request song song không +2.
   */
  private static async touchStreak(uid: mongoose.Types.ObjectId, date: string): Promise<void> {
    const user = await User.findById(uid).select('streakCount lastStudyDate');
    if (!user || user.lastStudyDate === date) return;

    const nextStreak = user.lastStudyDate === yesterdayKey() ? (user.streakCount || 0) + 1 : 1;
    await User.updateOne(
      { _id: uid, lastStudyDate: user.lastStudyDate ?? { $exists: false } },
      {
        $set: { streakCount: nextStreak, lastStudyDate: date },
        // Kỷ lục chuỗi dài nhất + tổng ngày học (mỗi ngày chỉ vào nhánh này 1 lần)
        $max: { longestStreak: nextStreak },
        $inc: { totalStudyDays: 1 },
      }
    );
  }

  /** 7 ngày của tuần hiện tại (Thứ 2 → Chủ nhật) dạng 'YYYY-MM-DD'. */
  private static currentWeekDates(now: Date = new Date()): string[] {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return todayKey(d);
    });
  }

  /** Trạng thái hôm nay: streak + tuần + tiến độ quest + tổng thưởng đang chờ. */
  static async getToday(userId: string): Promise<TodayResponse> {
    const date = todayKey();
    const uid = new mongoose.Types.ObjectId(userId);
    const weekDates = GamificationService.currentWeekDates();

    const [defs, user, logs, weekStudied] = await Promise.all([
      GamificationService.getQuestDefs(),
      User.findById(uid).select('streakCount lastStudyDate longestStreak totalStudyDays'),
      UserQuestLog.find({ uid, date }).lean(),
      UserQuestLog.distinct('date', {
        uid,
        date: { $in: weekDates },
        progress: { $gt: 0 },
      }) as Promise<string[]>,
    ]);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);

    const studiedSet = new Set(weekStudied);
    const week: WeekDayItem[] = weekDates.map((d, i) => ({
      date: d,
      weekday: i,
      studied: studiedSet.has(d),
      isToday: d === date,
    }));

    const logMap = new Map(logs.map((l) => [l.questId, l]));
    const quests: TodayQuestItem[] = defs.map((q) => {
      const log = logMap.get(q.questId);
      const progress = Math.min(log?.progress ?? 0, q.target);
      return {
        id: q.questId,
        type: q.type,
        title: q.title,
        target: q.target,
        rewardTokens: q.rewardTokens,
        progress,
        completed: progress >= q.target,
        claimed: !!log?.claimedAt,
      };
    });

    return {
      date,
      streakCount: user.streakCount || 0,
      longestStreak: Math.max(user.longestStreak || 0, user.streakCount || 0),
      totalStudyDays: user.totalStudyDays || 0,
      studiedToday: user.lastStudyDate === date,
      week,
      quests,
      claimableTokens: quests
        .filter((q) => q.completed && !q.claimed)
        .reduce((sum, q) => sum + q.rewardTokens, 0),
    };
  }

  /**
   * Nhận thưởng một quest đã hoàn thành hôm nay.
   * Chốt idempotency: findOneAndUpdate với điều kiện `claimedAt: null` —
   * hai request song song thì chỉ một request "chiếm" được document.
   * Token cộng bằng $inc, không đọc-sửa-ghi.
   */
  static async claim(userId: string, questId: string): Promise<{ questId: string; rewardTokens: number; tokenBalance: number }> {
    const defs = await GamificationService.getQuestDefs();
    const quest = defs.find((q) => q.questId === questId);
    if (!quest) throw new AppError('Nhiệm vụ không tồn tại', 404);

    const date = todayKey();
    const uid = new mongoose.Types.ObjectId(userId);

    const claimedLog = await UserQuestLog.findOneAndUpdate(
      {
        uid,
        questId,
        date,
        claimedAt: null,
        progress: { $gte: quest.target },
      },
      { $set: { claimedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!claimedLog) {
      // Phân biệt lý do để báo lỗi đúng
      const log = await UserQuestLog.findOne({ uid, questId, date }).lean();
      if (log?.claimedAt) throw new AppError('Bạn đã nhận thưởng nhiệm vụ này hôm nay rồi', 400);
      throw new AppError('Nhiệm vụ chưa hoàn thành', 400);
    }

    const updated = await User.findByIdAndUpdate(
      uid,
      { $inc: { token: quest.rewardTokens } },
      { returnDocument: 'after', select: 'token' }
    );

    return {
      questId,
      rewardTokens: quest.rewardTokens,
      tokenBalance: updated?.token ?? 0,
    };
  }
}
