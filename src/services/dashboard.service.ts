import mongoose from 'mongoose';
import User from '../models/user.model';
import Character from '../models/character.model';
import HistoricalContext from '../models/historical-context.model';
import ChatSession from '../models/chat-session.model';
import Message from '../models/message.model';
import Quiz from '../models/quiz.model';
import QuizSession from '../models/quiz-session.model';
import Order from '../models/order.model';
import Tier from '../models/tier.model';

export class DashboardService {
  static async getOverview() {
    const totalUsers = await User.countDocuments({ deletedAt: { $exists: false } });
    const totalCharacters = await Character.countDocuments({ deletedAt: { $exists: false } });
    const totalContexts = await HistoricalContext.countDocuments({ deletedAt: { $exists: false } });
    const totalChatSessions = await ChatSession.countDocuments({ deletedAt: { $exists: false } });
    
    // Revenue placeholder since Order logic might differ
    const revenueAggr = await Order.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueAggr.length > 0 ? revenueAggr[0].total : 0;

    return {
      totalUsers,
      totalCharacters,
      totalContexts,
      totalChatSessions,
      totalRevenue,
    };
  }

  static async getUserAnalytics(from?: string, to?: string, granularity: string = 'day') {
    // Basic implementation
    const totalUsers = await User.countDocuments({ deletedAt: { $exists: false } });
    const activeUsers = await User.countDocuments({ isActive: true, deletedAt: { $exists: false } });
    
    const roleDistribution = await User.aggregate([
      { $match: { deletedAt: { $exists: false } } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    return {
      summary: { totalUsers, activeUsers },
      roleDistribution: roleDistribution.map(r => ({ role: r._id, count: r.count })),
      trend: [] // Placeholder for time-series aggregation
    };
  }

  static async getContentSummary() {
    const totalCharacters = await Character.countDocuments({ deletedAt: { $exists: false } });
    const totalContexts = await HistoricalContext.countDocuments({ deletedAt: { $exists: false } });
    
    return {
      totalCharacters,
      totalContexts,
      totalDocuments: 0 // If document model exists
    };
  }

  static async getChatActivity(from?: string, to?: string, granularity: string = 'day') {
    const totalSessions = await ChatSession.countDocuments({ deletedAt: { $exists: false } });
    const totalMessages = await Message.countDocuments({ deletedAt: { $exists: false } });
    
    return {
      summary: { totalSessions, totalMessages },
      trend: [] // Placeholder
    };
  }

  static async getSystemHealth() {
    return {
      status: "UP",
      uptimeSeconds: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  static async getRevenue(from?: string, to?: string, granularity: string = 'day') {
    const revenueAggr = await Order.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueAggr.length > 0 ? revenueAggr[0].total : 0;
    
    return {
      summary: { totalRevenue },
      trend: []
    };
  }

  static async getPayments(from?: string, to?: string, granularity: string = 'day') {
    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    return {
      statusCounts: statusCounts.map(s => ({ status: s._id, count: s.count })),
      trend: []
    };
  }

  static async getTiers(from?: string, to?: string, granularity: string = 'day') {
    const tierDistribution = await User.aggregate([
      { $match: { deletedAt: { $exists: false } } },
      { $group: { _id: '$tierId', users: { $sum: 1 } } },
      { $lookup: { from: 'tiers', localField: '_id', foreignField: '_id', as: 'tier' } },
      { $unwind: { path: '$tier', preserveNullAndEmptyArrays: true } },
      { $project: { tierTitle: { $ifNull: ['$tier.title', 'Unknown'] }, users: 1 } }
    ]);
    return {
      tierDistribution
    };
  }

  static async getQuiz(from?: string, to?: string, granularity: string = 'day') {
    const totalQuizzes = await Quiz.countDocuments({ deletedAt: { $exists: false } });
    const totalSessions = await QuizSession.countDocuments({ deletedAt: { $exists: false } });
    return {
      summary: { totalQuizzes, totalSessions }
    };
  }

  static async getTokens(from?: string, to?: string, granularity: string = 'day') {
    const totalTokenUsedAggr = await Message.aggregate([
      { $match: { deletedAt: { $exists: false }, token: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$token' } } }
    ]);
    const totalTokenUsed = totalTokenUsedAggr.length > 0 ? totalTokenUsedAggr[0].total : 0;
    
    return {
      summary: { totalTokenUsed },
      trend: []
    };
  }
}
