import { Router } from 'express';
import { SystemController } from '../controllers/system.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const systemController = new SystemController();

/**
 * @swagger
 * /api/system/overview:
 *   get:
 *     tags:
 *       - System
 *     summary: Get system overview
 *     description: Get system overview and features information
 *     responses:
 *       200:
 *         description: System overview data
 *       500:
 *         description: Internal server error
 */
router.get('/overview', systemController.getSystemOverview);

/**
 * @swagger
 * /api/system/health:
 *   get:
 *     tags:
 *       - System
 *     summary: Get system health
 *     description: Get system health and statistics
 *     responses:
 *       200:
 *         description: System health data
 *       500:
 *         description: Internal server error
 */
router.get('/health', systemController.getSystemHealth);

/**
 * @swagger
 * /api/system/card-settings:
 *   get:
 *     tags:
 *       - System
 *     summary: Get card settings (masked)
 *     description: Get the current card settings for displaying to users during payment. Card number is masked.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Card settings (masked for security)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     cardNumber:
 *                       type: string
 *                       example: "****1234"
 *                     cardHolderName:
 *                       type: string
 *                       example: "John Doe"
 *       500:
 *         description: Internal server error
 *   put:
 *     tags:
 *       - System
 *     summary: Update card settings
 *     description: Update the card number and/or cardholder name. Admin only.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardNumber:
 *                 type: string
 *                 example: "1234567890123456"
 *               cardHolderName:
 *                 type: string
 *                 example: "John Doe"
 *     responses:
 *       200:
 *         description: Card settings updated successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.get('/card-settings', authenticateToken, systemController.getCardSettings);
router.post('/card-settings', authenticateToken, requireAdmin, systemController.updateCardSettings);
router.put('/card-settings', authenticateToken, requireAdmin, systemController.updateCardSettings);

router.get('/exchange-rate-settings', authenticateToken, systemController.getExchangeRateSettings);
router.post('/exchange-rate-settings', authenticateToken, requireAdmin, systemController.updateExchangeRate);
router.put('/exchange-rate-settings', authenticateToken, requireAdmin, systemController.updateExchangeRate);

export default router;
