import { Router } from 'express';
import { GamificationController } from '../controllers/gamification.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateQuestSchema, questIdParamSchema } from '../validations/gamification.validation';
import { UserRole } from '../types/enums';

const router = Router();

// Quản lý định nghĩa quest hằng ngày — CONTENT_ADMIN hoặc SYSTEM_ADMIN
router.use(authenticate, authorizeRoles(UserRole.ContentAdmin, UserRole.SystemAdmin));

/**
 * @openapi
 * tags:
 *   name: Staff Quests
 *   description: >
 *     Quản lý định nghĩa nhiệm vụ hằng ngày (daily quest) — chỉ Read + Update, không có
 *     Create/Delete. Quest được seed sẵn tự động (xem GamificationService.getQuestDefs);
 *     staff chỉ chỉnh title/target/rewardTokens/order/isActive của quest đã tồn tại.
 *     Dùng `isActive:false` để ẩn quest khỏi app (staff vẫn xem/bật lại được qua
 *     GET /staff/quests), tránh rủi ro tái sử dụng questId khiến lịch sử tiến độ cũ
 *     của user gắn nhầm vào quest mới nếu có thể tạo/xoá tự do.
 */

/**
 * @openapi
 * /staff/quests:
 *   get:
 *     tags: [Staff Quests]
 *     summary: List all quest definitions (including inactive ones)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Quests retrieved successfully
 */
router.get('/', GamificationController.staffListQuests);

/**
 * @openapi
 * /staff/quests/{id}:
 *   get:
 *     tags: [Staff Quests]
 *     summary: Get a quest definition by id
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quest retrieved successfully
 *       404:
 *         description: Quest not found
 */
router.get('/:id', validate(questIdParamSchema), GamificationController.staffGetQuest);

/**
 * @openapi
 * /staff/quests/{id}:
 *   put:
 *     tags: [Staff Quests]
 *     summary: Update a quest definition (questId is immutable)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [CHAT, QUIZ, READ_CONTEXT] }
 *               title: { type: string }
 *               target: { type: integer, minimum: 1 }
 *               rewardTokens: { type: integer, minimum: 0 }
 *               order: { type: integer }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Quest updated successfully
 *       400:
 *         description: An active quest of this type already exists
 *       404:
 *         description: Quest not found
 */
router.put('/:id', validate(updateQuestSchema), GamificationController.staffUpdateQuest);

export default router;
