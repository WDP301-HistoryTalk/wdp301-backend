import User from '../models/user.model';
import { UserRole, OrderStatus } from '../types/enums';
import Character from '../models/character.model';
import HistoricalContext from '../models/historical-context.model';
import ChatSession from '../models/chat-session.model';
import Message from '../models/message.model';
import Quiz from '../models/quiz.model';
import QuizSession from '../models/quiz-session.model';
import Order from '../models/order.model';
import Tier from '../models/tier.model';

const resolveDateRange = (fromStr?: string, toStr?: string) => {
  const to = toStr ? new Date(toStr) : new Date();
  if (toStr) to.setHours(23, 59, 59, 999);
  const from = fromStr ? new Date(fromStr) : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  if (fromStr) from.setHours(0, 0, 0, 0);
  return { from, to };
};

const getMongoDateFormat = (granularity: string) => {
  if (granularity === 'year') return '%Y';
  if (granularity === 'month') return '%Y-%m';
  return '%Y-%m-%d';
};

const getTrendDates = (from: Date, to: Date, granularity: string) => {
  const dates = [];
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  
  while (current <= to) {
    if (granularity === 'year') {
      dates.push(current.getFullYear().toString());
      current.setFullYear(current.getFullYear() + 1);
    } else if (granularity === 'month') {
      const month = (current.getMonth() + 1).toString().padStart(2, '0');
      dates.push(`${current.getFullYear()}-${month}`);
      current.setMonth(current.getMonth() + 1);
    } else {
      const month = (current.getMonth() + 1).toString().padStart(2, '0');
      const day = current.getDate().toString().padStart(2, '0');
      dates.push(`${current.getFullYear()}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }
  }
  return dates;
};

export class DashboardService {
  static async getOverview() {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = totalUsers - activeUsers;
    const deletedUsers = await User.countDocuments({ deletedAt: { $exists: true } });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const newTodayUsers = await User.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });
    const newThisMonthUsers = await User.countDocuments({ createdAt: { $gte: firstDayOfMonth } });

    const customers = await User.countDocuments({ role: UserRole.Customer });
    const contentAdmins = await User.countDocuments({ role: UserRole.ContentAdmin });
    const systemAdmins = await User.countDocuments({ role: UserRole.SystemAdmin });

    const historicalContexts = await HistoricalContext.countDocuments();
    const publishedHistoricalContexts = await HistoricalContext.countDocuments({ isPublished: true });
    const characters = await Character.countDocuments();
    const publishedCharacters = await Character.countDocuments({ isPublished: true });
    const documents = 0;

    const sessions = await ChatSession.countDocuments();
    const messages = await Message.countDocuments();
    const messagesToday = await Message.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });

    return {
      users: { total: totalUsers, active: activeUsers, inactive: inactiveUsers, deleted: deletedUsers, newToday: newTodayUsers, newThisMonth: newThisMonthUsers },
      roles: { customers, contentAdmins, systemAdmins },
      content: { historicalContexts, publishedHistoricalContexts, characters, publishedCharacters, documents },
      chat: { sessions, messages, messagesToday },
      systemHealth: { status: "UP", lastCheckedAt: new Date().toISOString() }
    };
  }

  static async getUserAnalytics(fromStr?: string, toStr?: string, granularity: string = 'day') {
    const { from, to } = resolveDateRange(fromStr, toStr);
    const format = getMongoDateFormat(granularity);
    const trendDates = getTrendDates(from, to, granularity);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = totalUsers - activeUsers;
    const deletedUsers = await User.countDocuments({ deletedAt: { $exists: true } });
    const recentlyActiveDate = new Date();
    recentlyActiveDate.setDate(recentlyActiveDate.getDate() - 7);
    const recentlyActive = await User.countDocuments({ lastActiveDate: { $gte: recentlyActiveDate } });

    const roleDistribution = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);

    const newUsersAggr = await User.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, count: { $sum: 1 } } }
    ]);
    const activeUsersAggr = await User.aggregate([
      { $match: { lastActiveDate: { $gte: from, $lte: to }, isActive: true } },
      { $group: { _id: { $dateToString: { format, date: '$lastActiveDate' } }, count: { $sum: 1 } } }
    ]);

    const newUsersMap = Object.fromEntries(newUsersAggr.map(d => [d._id, d.count]));
    const activeUsersMap = Object.fromEntries(activeUsersAggr.map(d => [d._id, d.count]));

    return {
      summary: { total: totalUsers, active: activeUsers, inactive: inactiveUsers, deleted: deletedUsers, recentlyActive },
      byRole: roleDistribution.map(r => ({ role: r._id, count: r.count })),
      trend: trendDates.map(date => ({
        date,
        newUsers: newUsersMap[date] || 0,
        activeUsers: activeUsersMap[date] || 0
      }))
    };
  }

  static async getContentSummary() {
    const totalContexts = await HistoricalContext.countDocuments();
    const publishedContexts = await HistoricalContext.countDocuments({ isPublished: true });
    const activeContexts = await HistoricalContext.countDocuments({ deletedAt: { $exists: false } });

    const totalCharacters = await Character.countDocuments();
    const publishedCharacters = await Character.countDocuments({ isPublished: true });
    const activeCharacters = await Character.countDocuments({ deletedAt: { $exists: false } });

    return {
      historicalContexts: { total: totalContexts, published: publishedContexts, active: activeContexts },
      characters: { total: totalCharacters, published: publishedCharacters, active: activeCharacters },
      documents: { total: 0, published: 0, active: 0 }
    };
  }

  static async getChatActivity(fromStr?: string, toStr?: string, granularity: string = 'day') {
    const { from, to } = resolveDateRange(fromStr, toStr);
    const format = getMongoDateFormat(granularity);
    const trendDates = getTrendDates(from, to, granularity);

    const sessions = await ChatSession.countDocuments();
    const activeSessions = sessions;
    const messages = await Message.countDocuments();
    const userMessages = await Message.countDocuments({ sender: 'user' });
    const aiMessages = await Message.countDocuments({ sender: 'character' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sessionsToday = await ChatSession.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });
    const messagesToday = await Message.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });

    const sessionsAggr = await ChatSession.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, count: { $sum: 1 } } }
    ]);
    const messagesAggr = await Message.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, count: { $sum: 1 } } }
    ]);

    const sessionsMap = Object.fromEntries(sessionsAggr.map(d => [d._id, d.count]));
    const messagesMap = Object.fromEntries(messagesAggr.map(d => [d._id, d.count]));

    return {
      summary: { sessions, activeSessions, messages, userMessages, aiMessages, sessionsToday, messagesToday },
      trend: trendDates.map(date => ({
        date,
        sessions: sessionsMap[date] || 0,
        messages: messagesMap[date] || 0
      }))
    };
  }

  static async getSystemHealth() {
    return {
      status: "UP",
      uptime: String(process.uptime()),
      jvmMemoryUsed: process.memoryUsage().heapUsed,
      jvmMemoryMax: process.memoryUsage().heapTotal,
      httpRequestCount: 0,
      httpErrorCount: 0,
      lastCheckedAt: new Date().toISOString()
    };
  }

  static async getRevenue(fromStr?: string, toStr?: string, granularity: string = 'day') {
    const { from, to } = resolveDateRange(fromStr, toStr);
    const format = getMongoDateFormat(granularity);
    const trendDates = getTrendDates(from, to, granularity);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    const revenueAggr = await Order.aggregate([
      { $match: { status: OrderStatus.Paid } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalRevenue = revenueAggr.length > 0 ? revenueAggr[0].total : 0;
    const paidOrders = revenueAggr.length > 0 ? revenueAggr[0].count : 0;
    const averageOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;

    const getRevenueBetween = async (start: Date, end?: Date) => {
      const match: any = { status: OrderStatus.Paid, paidAt: { $gte: start } };
      if (end) match.paidAt.$lt = end;
      const res = await Order.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
      return res.length > 0 ? res[0].total : 0;
    };

    const revenueToday = await getRevenueBetween(today, tomorrow);
    const revenueThisMonth = await getRevenueBetween(monthStart, tomorrow);
    const revenueThisYear = await getRevenueBetween(yearStart);

    const statusCountsAggr = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

    const trendAggr = await Order.aggregate([
      { $match: { status: OrderStatus.Paid, paidAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format, date: '$paidAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const trendMap = Object.fromEntries(trendAggr.map(d => [d._id, { revenue: d.total, paidOrders: d.count }]));

    const revenueByTierAggr = await Order.aggregate([
      { $match: { status: OrderStatus.Paid, paidAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$tierId', revenue: { $sum: '$amount' }, paidOrders: { $sum: 1 } } }
    ]);
    const tierIds = revenueByTierAggr.map(r => r._id);
    const tiers = await Tier.find({ _id: { $in: tierIds } });
    const tierMap = Object.fromEntries(tiers.map(t => [t._id.toString(), t.title]));

    return {
      summary: { totalRevenue, revenueToday, revenueThisMonth, revenueThisYear, paidOrders, averageOrderValue },
      ordersByStatus: statusCountsAggr.map(s => ({ status: s._id, count: s.count })),
      revenueByTier: revenueByTierAggr.map(r => ({
        tierId: r._id,
        tierTitle: tierMap[r._id.toString()] || 'Unknown',
        revenue: r.revenue,
        paidOrders: r.paidOrders
      })),
      trend: trendDates.map(date => ({
        date,
        revenue: trendMap[date]?.revenue || 0,
        paidOrders: trendMap[date]?.paidOrders || 0
      }))
    };
  }

  static async getPayments(fromStr?: string, toStr?: string, granularity: string = 'day') {
    const { from, to } = resolveDateRange(fromStr, toStr);
    const format = getMongoDateFormat(granularity);
    const trendDates = getTrendDates(from, to, granularity);

    const statusCountsAggr = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const counts: Record<string, number> = {};
    statusCountsAggr.forEach(s => counts[s._id] = s.count);

    const trendAggr = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { date: { $dateToString: { format, date: '$createdAt' } }, status: '$status' }, count: { $sum: 1 } } }
    ]);
    
    const trendMap: Record<string, any> = {};
    trendAggr.forEach(t => {
      const date = t._id.date;
      if (!trendMap[date]) trendMap[date] = { date, success: 0, failed: 0 };
      if (t._id.status === OrderStatus.Paid) trendMap[date].success += t.count;
      if (t._id.status === 'failed') trendMap[date].failed += t.count;
    });

    return {
      summary: {
        totalOrders: await Order.countDocuments(),
        pendingOrders: counts[OrderStatus.Pending] || 0,
        paidOrders: counts[OrderStatus.Paid] || 0,
        cancelledOrders: counts[OrderStatus.Cancelled] || 0,
        expiredOrders: counts[OrderStatus.Expired] || 0,
        failedOrders: counts['failed'] || 0,
        successfulTransactions: counts[OrderStatus.Paid] || 0,
        failedTransactions: counts['failed'] || 0
      },
      transactionTrend: trendDates.map(date => trendMap[date] || { date, success: 0, failed: 0 })
    };
  }

  static async getTiers(fromStr?: string, toStr?: string, _granularity: string = 'day') {
    const activeTiers = await Tier.countDocuments({ isActive: true });
    
    const allTiers = await Tier.find();
    const paidTierIds = allTiers.filter(t => t.amount > 0).map(t => t._id);
    const freeTierIds = allTiers.filter(t => t.amount === 0).map(t => t._id);
    
    const paidUsers = await User.countDocuments({ tierId: { $in: paidTierIds }, role: UserRole.Customer });
    const freeUsers = await User.countDocuments({ 
      role: UserRole.Customer, 
      $or: [{ tierId: { $in: freeTierIds } }, { tierId: null }] 
    });
    
    const expiringSoonDate = new Date();
    expiringSoonDate.setDate(expiringSoonDate.getDate() + 7);
    const expiringSoonSubscriptions = await User.countDocuments({ tierId: { $in: paidTierIds }, tierExpiresAt: { $lt: expiringSoonDate, $gt: new Date() } });

    const usersByTierAggr = await User.aggregate([
      { $match: { tierId: { $ne: null }, role: UserRole.Customer } },
      { $group: { _id: '$tierId', count: { $sum: 1 } } }
    ]);
    const tierMap = Object.fromEntries(allTiers.map(t => [t._id.toString(), t.title]));

    const usersByTier = usersByTierAggr.map(r => ({
      tierId: r._id,
      tierTitle: tierMap[r._id.toString()] || 'Unknown',
      users: r.count
    }));

    return {
      summary: { 
        activeTiers, 
        currentPaidUsers: paidUsers, 
        currentFreeUsers: freeUsers, 
        activeSubscriptions: paidUsers, 
        expiringSoonSubscriptions, 
        freeToPaidConversionRate: (freeUsers + paidUsers) > 0 ? paidUsers / (freeUsers + paidUsers) : 0 
      },
      usersByTier,
      purchasesByTier: [] // Complex to calculate exactly without historical tier links
    };
  }

  static async getQuiz(fromStr?: string, toStr?: string, granularity: string = 'day') {
    const { from, to } = resolveDateRange(fromStr, toStr);
    const format = getMongoDateFormat(granularity);
    const trendDates = getTrendDates(from, to, granularity);

    const totalQuizzes = await Quiz.countDocuments();
    const publishedQuizzes = await Quiz.countDocuments({ isPublished: true });
    const draftQuizzes = await Quiz.countDocuments({ isPublished: false });
    const deletedQuizzes = await Quiz.countDocuments({ deletedAt: { $exists: true } });
    
    const startedSessions = await QuizSession.countDocuments();
    const completedSessions = await QuizSession.countDocuments({ status: 'completed' });

    const sessionsTrendAggr = await QuizSession.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { date: { $dateToString: { format, date: '$createdAt' } }, status: '$status' }, count: { $sum: 1 } } }
    ]);
    const trendMap: Record<string, any> = {};
    sessionsTrendAggr.forEach(t => {
      const date = t._id.date;
      if (!trendMap[date]) trendMap[date] = { date, started: 0, completed: 0 };
      if (t._id.status === 'completed') trendMap[date].completed += t.count;
      else trendMap[date].started += t.count;
    });

    return {
      summary: {
        totalQuizzes, publishedQuizzes, draftQuizzes, deletedQuizzes, startedSessions, completedSessions,
        completionRate: startedSessions > 0 ? (completedSessions / startedSessions) : 0,
        averageScorePercentage: 0
      },
      sessionsTrend: trendDates.map(date => trendMap[date] || { date, started: 0, completed: 0 }),
      topQuizzes: [],
      topWrongQuestions: []
    };
  }

  static async getTokens(fromStr?: string, toStr?: string, granularity: string = 'day') {
    const { from, to } = resolveDateRange(fromStr, toStr);
    const format = getMongoDateFormat(granularity);
    const trendDates = getTrendDates(from, to, granularity);

    const messagesAggr = await Message.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, tokens: { $sum: '$tokensUsed' } } }
    ]);
    const trendMap = Object.fromEntries(messagesAggr.map(d => [d._id, d.tokens]));

    const usersAggr = await User.aggregate([
      { $group: { _id: null, totalRemaining: { $sum: '$token' }, usersZero: { $sum: { $cond: [{ $lte: ['$token', 0] }, 1, 0] } }, count: { $sum: 1 } } }
    ]);
    const totalRemaining = usersAggr.length > 0 ? usersAggr[0].totalRemaining : 0;
    const usersOutOfTokens = usersAggr.length > 0 ? usersAggr[0].usersZero : 0;
    const count = usersAggr.length > 0 ? usersAggr[0].count : 1;

    return {
      summary: { 
        promptTokens: 0, 
        completionTokens: 0, 
        totalTokens: await Message.aggregate([{ $group: { _id: null, t: { $sum: '$tokensUsed' } } }]).then(r => r[0]?.t || 0), 
        remainingTokens: totalRemaining, 
        averageRemainingTokens: totalRemaining / count, 
        usersOutOfTokens, 
        estimatedCost: 0 
      },
      trend: trendDates.map(date => ({
        date,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: trendMap[date] || 0
      })),
      tokenBalanceByTier: [],
      topUsersByTokenUsage: []
    };
  }
}
