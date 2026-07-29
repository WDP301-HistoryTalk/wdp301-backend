import { z } from 'zod';

export const claimQuestSchema = z.object({
  body: z.object({
    questId: z
      .string({ message: 'questId is required' })
      .min(1, 'questId is required')
      .max(50, 'Invalid questId'),
  }),
});

export type ClaimQuestInput = z.infer<typeof claimQuestSchema>;

// ── Staff: quản lý định nghĩa quest (DailyQuest) — chỉ Read + Update ──────
// Không có endpoint tạo/xoá: quest được seed sẵn (xem GamificationService.getQuestDefs),
// staff chỉ chỉnh title/target/rewardTokens/order/isActive của quest đã tồn tại.
// type chỉ nhận 3 giá trị đã wire sẵn nơi bắn recordProgress() — xem
// docs/GAMIFICATION_CRUD_PLAN.md §2.1.
const questTypeSchema = z.enum(['CHAT', 'QUIZ', 'READ_CONTEXT']);

export const updateQuestSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
  body: z
    .object({
      type: questTypeSchema,
      title: z.string().min(1, 'title is required').max(200),
      target: z.coerce.number().int().min(1, 'target phải >= 1'),
      rewardTokens: z.coerce.number().int().min(0, 'rewardTokens phải >= 0'),
      order: z.coerce.number().int(),
      isActive: z.coerce.boolean(),
    })
    .partial(),
});

export const questIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});

export type UpdateQuestBody = z.infer<typeof updateQuestSchema>['body'];
