import User from '../models/user.model';
import { UserRole } from '../types/enums';
import Character from '../models/character.model';
import HistoricalContext from '../models/historical-context.model';
import ChatSession from '../models/chat-session.model';
import Message from '../models/message.model';
import Quiz from '../models/quiz.model';
import QuizSession from '../models/quiz-session.model';
import Order from '../models/order.model';

export class DashboardService {
  static async getOverview() {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = totalUsers - activeUsers;
    const deletedUsers = await User.countDocuments({ deletedAt: { $exists: true } });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const newTodayUsers = await User.countDocuments({ createdAt: { $gte: today } });
    const newThisMonthUsers = await User.countDocuments({ createdAt: { $gte: firstDayOfMonth } });

    const customers = await User.countDocuments({ role: UserRole.Customer });
    const contentAdmins = await User.countDocuments({ role: UserRole.ContentAdmin });
    const systemAdmins = await User.countDocuments({ role: UserRole.SystemAdmin });

    const historicalContexts = await HistoricalContext.countDocuments();
    const publishedHistoricalContexts = await HistoricalContext.countDocuments({ isPublished: true });
    const characters = await Character.countDocuments();
    const publishedCharacters = await Character.countDocuments({ isPublished: true });
    const documents = 0; // Placeholder if document stats needed

    const sessions = await ChatSession.countDocuments();
    const messages = await Message.countDocuments();
    const messagesToday = await Message.countDocuments({ createdAt: { $gte: today } });

    return {
      users: { total: totalUsers, active: activeUsers, inactive: inactiveUsers, deleted: deletedUsers, newToday: newTodayUsers, newThisMonth: newThisMonthUsers },
      roles: { customers, contentAdmins, systemAdmins },
      content: { historicalContexts, publishedHistoricalContexts, characters, publishedCharacters, documents },
      chat: { sessions, messages, messagesToday },
      systemHealth: { status: "UP", lastCheckedAt: new Date().toISOString() }
    };
  }

  static async getUserAnalytics(_from?: string, _to?: string, _granularity: string = 'day') {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = totalUsers - activeUsers;
    const deletedUsers = await User.countDocuments({ deletedAt: { $exists: true } });
    const recentlyActive = activeUsers;

    const roleDistribution = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    return {
      summary: { total: totalUsers, active: activeUsers, inactive: inactiveUsers, deleted: deletedUsers, recentlyActive },
      byRole: roleDistribution.map(r => ({ role: r._id, count: r.count })),
      trend: [] 
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
      documents: { total: 0, active: 0 }
    };
  }

  static async getChatActivity(_from?: string, _to?: string, _granularity: string = 'day') {
    const sessions = await ChatSession.countDocuments();
    const activeSessions = sessions;
    const messages = await Message.countDocuments();
    const userMessages = await Message.countDocuments({ sender: 'user' });
    const aiMessages = await Message.countDocuments({ sender: 'character' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionsToday = await ChatSession.countDocuments({ createdAt: { $gte: today } });
    const messagesToday = await Message.countDocuments({ createdAt: { $gte: today } });

    return {
      summary: { sessions, activeSessions, messages, userMessages, aiMessages, sessionsToday, messagesToday },
      trend: []
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

  static async getRevenue(_from?: string, _to?: string, _granularity: string = 'day') {
    const revenueAggr = await Order.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalRevenue = revenueAggr.length > 0 ? revenueAggr[0].total : 0;
    const paidOrders = revenueAggr.length > 0 ? revenueAggr[0].count : 0;
    const averageOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;

    const statusCountsAggr = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    return {
      summary: { totalRevenue, revenueToday: 0, revenueThisMonth: 0, revenueThisYear: totalRevenue, paidOrders, averageOrderValue },
      ordersByStatus: statusCountsAggr.map(s => ({ status: s._id, count: s.count })),
      revenueByTier: [],
      trend: []
    };
  }

  static async getPayments(_from?: string, _to?: string, _granularity: string = 'day') {
    const statusCountsAggr = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const counts: Record<string, number> = {};
    statusCountsAggr.forEach(s => counts[s._id] = s.count);

    return {
      summary: {
        totalOrders: await Order.countDocuments(),
        pendingOrders: counts['PENDING'] || 0,
        paidOrders: counts['PAID'] || 0,
        cancelledOrders: counts['CANCELLED'] || 0,
        expiredOrders: counts['EXPIRED'] || 0,
        failedOrders: counts['FAILED'] || 0,
        successfulTransactions: counts['PAID'] || 0,
        failedTransactions: counts['FAILED'] || 0
      },
      transactionTrend: []
    };
  }

  static async getTiers(_from?: string, _to?: string, _granularity: string = 'day') {
    return {
      summary: { activeTiers: 0, currentPaidUsers: 0, currentFreeUsers: 0, activeSubscriptions: 0, expiringSoonSubscriptions: 0, freeToPaidConversionRate: 0 },
      usersByTier: [],
      purchasesByTier: []
    };
  }

  static async getQuiz(_from?: string, _to?: string, _granularity: string = 'day') {
    const totalQuizzes = await Quiz.countDocuments();
    const publishedQuizzes = await Quiz.countDocuments({ isPublished: true });
    const draftQuizzes = await Quiz.countDocuments({ isPublished: false });
    const deletedQuizzes = await Quiz.countDocuments({ deletedAt: { $exists: true } });
    
    const startedSessions = await QuizSession.countDocuments();
    const completedSessions = await QuizSession.countDocuments({ status: 'completed' });

    return {
      summary: {
        totalQuizzes, publishedQuizzes, draftQuizzes, deletedQuizzes, startedSessions, completedSessions,
        completionRate: startedSessions > 0 ? (completedSessions / startedSessions) : 0,
        averageScorePercentage: 0
      },
      sessionsTrend: [],
      topQuizzes: [],
      topWrongQuestions: []
    };
  }

  static async getTokens(_from?: string, _to?: string, _granularity: string = 'day') {
    return {
      summary: { promptTokens: 0, completionTokens: 0, totalTokens: 0, remainingTokens: 0, averageRemainingTokens: 0, usersOutOfTokens: 0, estimatedCost: 0 },
      trend: [],
      tokenBalanceByTier: [],
      topUsersByTokenUsage: []
    };
  }
}
