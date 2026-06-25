import { Router } from 'express';
import { PublicController } from '../controllers/public.controller';
import { SystemController } from '../controllers/system.controller';

const router = Router();
const publicController = new PublicController();
const systemController = new SystemController();

/**
 * @swagger
 * components:
 *   schemas:
 *     ExchangeRateResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             sendAmount:
 *               type: number
 *               example: 1000
 *               description: Amount to send in RUB
 *             receiveAmount:
 *               type: number
 *               example: 14000
 *               description: Amount recipient receives in RWF
 *             rate:
 *               type: number
 *               example: 14
 *               description: Exchange rate RUB to RWF
 *             commission:
 *               type: number
 *               example: 100
 *               description: Fixed commission in RUB
 *             totalAmount:
 *               type: number
 *               example: 1100
 *               description: Total amount sender pays (sendAmount + commission)
 *             lastUpdated:
 *               type: string
 *               format: date-time
 *               description: When rate was last updated
 *     BankDetailsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             bankName:
 *               type: string
 *               example: "Sberbank Russia"
 *             accountName:
 *               type: string
 *               example: "SKYLINE TRANSFERS LLC"
 *             accountNumber:
 *               type: string
 *               example: "40817810123456789012"
 *             bik:
 *               type: string
 *               example: "044525225"
 *             inn:
 *               type: string
 *               example: "7707083893"
 *             instructions:
 *               type: string
 *               description: Payment instructions
 *     SystemHealthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               example: "healthy"
 *             uptime:
 *               type: number
 *               description: Server uptime in seconds
 *             timestamp:
 *               type: string
 *               format: date-time
 *             version:
 *               type: string
 *               example: "1.0.0"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               description: Error message
 *             code:
 *               type: string
 *               description: Error code
 */

/**
 * @swagger
 * /api/public/exchange-rate:
 *   get:
 *     summary: Get current exchange rate
 *     description: Calculate exchange rate from RUB to RWF. No authentication required.
 *     tags: [Public - Exchange Rates]
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: false
 *         schema:
 *           type: number
 *           minimum: 100
 *           maximum: 1000000
 *           default: 1000
 *         description: Amount in Russian Rubles to convert
 *         example: 1000
 *     responses:
 *       200:
 *         description: Exchange rate calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExchangeRateResponse'
 *             examples:
 *               standard_rate:
 *                 summary: Standard rate calculation
 *                 value:
 *                   success: true
 *                   data:
 *                     sendAmount: 1000
 *                     receiveAmount: 14000
 *                     rate: 14
 *                     commission: 0
 *                     totalAmount: 1000
 *                     lastUpdated: "2025-09-18T10:00:00.000Z"
 *       400:
 *         description: Invalid amount parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/exchange-rate', publicController.getExchangeRate);

/**
 * @swagger
 * /api/public/bank-details:
 *   get:
 *     summary: Get Russian bank account details for payments
 *     description: Retrieve bank account information where customers should send their payments. This uses domestic Russian banking to avoid sanctions.
 *     tags: [Public - Bank Details]
 *     responses:
 *       200:
 *         description: Bank details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BankDetailsResponse'
 *             examples:
 *               sberbank_details:
 *                 summary: Sberbank account details
 *                 value:
 *                   success: true
 *                   data:
 *                     bankName: "Sberbank Russia"
 *                     accountName: "SKYLINE TRANSFERS LLC"
 *                     accountNumber: "40817810123456789012"
 *                     bik: "044525225"
 *                     inn: "7707083893"
 *                     instructions: "Use transfer reference as payment description"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/bank-details', publicController.getBankDetails);

/**
 * @swagger
 * /api/public/system/overview:
 *   get:
 *     summary: Get system overview information
 *     description: Retrieve general system information and statistics
 *     tags: [Public - System]
 *     responses:
 *       200:
 *         description: System overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "SKYLINE Transfers"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     description:
 *                       type: string
 *                       example: "Russia to Rwanda money transfer service"
 *                     supportedCurrencies:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["RUB", "RWF"]
 *                     paymentMethods:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["BANK_TRANSFER", "MTN_MOBILE_MONEY"]
 */
router.get('/system/overview', systemController.getSystemOverview);

/**
 * @swagger
 * /api/public/system/health:
 *   get:
 *     summary: System health check endpoint
 *     description: Check if the system is running properly. Used for monitoring and load balancer health checks.
 *     tags: [Public - System]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemHealthResponse'
 *             examples:
 *               healthy_system:
 *                 summary: Healthy system response
 *                 value:
 *                   success: true
 *                   data:
 *                     status: "healthy"
 *                     uptime: 3600
 *                     timestamp: "2025-09-18T10:00:00.000Z"
 *                     version: "1.0.0"
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/system/health', systemController.getSystemHealth);

export default router;