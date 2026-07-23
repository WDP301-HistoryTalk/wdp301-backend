import { Router } from 'express';
import { GamificationController } from '../controllers/gamification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { claimQuestSchema } from '../validations/gamification.validation';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /gamification/today:
 *   get:
 *     tags: [Gamification]
 *     summary: Get today's streak and daily quests for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Today's gamification state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     date: { type: string, example: "2026-07-17" }
 *                     streakCount: { type: integer, example: 3 }
 *                     studiedToday: { type: boolean, example: true }
 *                     claimableTokens: { type: integer, example: 500 }
 *                     quests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, example: "chat_once" }
 *                           title: { type: string, example: "Trò chuyện với một nhân vật lịch sử" }
 *                           target: { type: integer, example: 1 }
 *                           rewardTokens: { type: integer, example: 500 }
 *                           progress: { type: integer, example: 1 }
 *                           completed: { type: boolean, example: true }
 *                           claimed: { type: boolean, example: false }
 */
router.get('/today', GamificationController.getToday);

/**
 * @openapi
 * /gamification/claim:
 *   post:
 *     tags: [Gamification]
 *     summary: Claim the token reward of a completed daily quest (idempotent per day)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questId]
 *             properties:
 *               questId: { type: string, example: "chat_once" }
 *     responses:
 *       200:
 *         description: Reward claimed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     questId: { type: string, example: "chat_once" }
 *                     rewardTokens: { type: integer, example: 500 }
 *                     tokenBalance: { type: integer, example: 1500 }
 *       400:
 *         description: Quest not completed yet, or already claimed today
 *       404:
 *         description: Unknown questId
 */
router.post('/claim', validate(claimQuestSchema), GamificationController.claim);

export default router;
