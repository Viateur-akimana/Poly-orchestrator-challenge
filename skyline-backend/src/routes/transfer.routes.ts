import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { transferLimiter } from '../middleware/rate-limit.middleware';
import { validateBody, validateParams, schemas } from '../middleware/validation.middleware';

const router = Router();
const transferController = new TransferController();

/**
 * @swagger
 * components:
 *   schemas:
 *     TransferOrder:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "transfer-abc123"
 *         userId:
 *           type: string
 *           example: "user-xyz789"
 *         senderName:
 *           type: string
 *           example: "John Doe"
 *         senderPhone:
 *           type: string
 *           example: "+7XXXXXXXXXX"
 *         recipientName:
 *           type: string
 *           example: "Jane Smith"
 *         recipientPhone:
 *           type: string
 *           example: "+250788123456"
 *         sendAmount:
 *           type: number
 *           example: 10000
 *         receiveAmount:
 *           type: number
 *           example: 140000
 *         exchangeRate:
 *           type: number
 *           example: 14.5
 *         fee:
 *           type: number
 *           example: 100
 *         totalAmount:
 *           type: number
 *           example: 10100
 *         status:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED]
 *           example: "PENDING"
 *         paymentStatus:
 *           type: string
 *           enum: [PENDING, VERIFIED, FAILED]
 *           example: "PENDING"
 *         paymentMethodType:
 *           type: string
 *           enum: [DIGITAL_WALLET]
 *           example: "DIGITAL_WALLET"
 *         notes:
 *           type: string
 *           example: "Transfer for family support"
 *         reference:
 *           type: string
 *           example: "SKY20241201001"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-12-01T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-12-01T10:30:00Z"
 */

/**
 * @swagger
 * /api/transfers/rate:
 *   get:
 *     summary: Get current exchange rate
 *     description: Get the current RUB to RWF exchange rate with fees
 *     tags: [Transfers]
 *     parameters:
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *           default: 1000
 *         description: Amount in RUB to calculate rate for
 *     responses:
 *       200:
 *         description: Exchange rate information
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
 *                     fromCurrency:
 *                       type: string
 *                       example: "RUB"
 *                     toCurrency:
 *                       type: string
 *                       example: "RWF"
 *                     sendAmount:
 *                       type: number
 *                       example: 1000
 *                     receiveAmount:
 *                       type: number
 *                       example: 13050
 *                     exchangeRate:
 *                       type: number
 *                       example: 14.5
 *                     commission:
 *                       type: number
 *                       example: 100
 *                     totalAmount:
 *                       type: number
 *                       example: 1100
 *                     processingTime:
 *                       type: string
 *                       example: "Real-time processing via SBP (1-2 minutes)"
 *                     paymentMethod:
 *                       type: string
 *                       example: "SBP (Sistema Bystrykh Platezhey)"
 */
router.get('/rate', transferController.getExchangeRate);

/**
 * @swagger
 * /api/transfers/track/{reference}:
 *   get:
 *     summary: Track transfer by reference (public)
 *     description: Get transfer details by reference number - public endpoint for tracking
 *     tags: [Transfers]
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer reference number
 *     responses:
 *       200:
 *         description: Transfer found
 *       404:
 *         description: Transfer not found
 */
router.get('/track/:reference', transferController.trackTransferByReference);

/**
 * @swagger
 * /api/transfers:
 *   post:
 *     summary: Create a new SBP-powered transfer order
 *     description: Create a new transfer order that will be processed via SBP payment
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientName
 *               - recipientPhone
 *               - sendAmount
 *             properties:
 *               recipientName:
 *                 type: string
 *                 example: "Jane Smith"
 *               recipientPhone:
 *                 type: string
 *                 example: "+250788123456"
 *               sendAmount:
 *                 type: number
 *                 example: 10000
 *               notes:
 *                 type: string
 *                 example: "Monthly support"
 *     responses:
 *       201:
 *         description: Transfer order created successfully
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
 *                     transfer:
 *                       $ref: '#/components/schemas/TransferOrder'
 *                     sbpPayment:
 *                       type: object
 *                       properties:
 *                         qrCode:
 *                           type: string
 *                           description: Base64 encoded QR code
 *                         deepLink:
 *                           type: string
 *                           description: SBP deep link for mobile apps
 *                         paymentMethods:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["PHONE", "QR_CODE", "BANK_APP"]
 *                     nextSteps:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Pay instantly via SBP", "Payment automatically verified", "Transfer completed in 1-2 minutes"]
 */
router.post('/', authenticateToken, transferLimiter, transferController.createTransferOrder);

/**
 * @swagger
 * /api/transfers/my:
 *   get:
 *     summary: Get user's transfers
 *     description: Get paginated list of transfers for the authenticated user
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of transfers per page
 *     responses:
 *       200:
 *         description: User transfers retrieved successfully
 */
router.get('/my', authenticateToken, transferController.getUserTransfers);

/**
 * @swagger
 * /api/transfers/{transferId}:
 *   get:
 *     summary: Get specific transfer
 *     description: Get details of a specific transfer
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID
 *     responses:
 *       200:
 *         description: Transfer retrieved successfully
 */
router.get('/:transferId', authenticateToken, transferController.getTransfer);

/**
 * @swagger
 * /api/transfers/{transferId}/cancel:
 *   post:
 *     summary: Cancel transfer
 *     description: Cancel a pending transfer
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Changed mind"
 *     responses:
 *       200:
 *         description: Transfer cancelled successfully
 */
router.post('/:transferId/cancel', authenticateToken, transferController.cancelTransfer);

/**
 * @swagger
 * /api/transfers/payment/info:
 *   get:
 *     summary: Get SBP payment information
 *     description: Get information about SBP payment methods and supported banks
 *     tags: [SBP]
 *     responses:
 *       200:
 *         description: SBP payment information
 */
router.get('/payment/info', transferController.getPaymentInfo);

/**
 * @swagger
 * /api/transfers/{id}/upload-proof:
 *   post:
 *     summary: Upload payment proof
 *     description: Upload proof of manual bank payment (screenshot/receipt) for verification
 *     tags: [Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileUrl:
 *                 type: string
 *                 description: URL of uploaded proof file
 *               fileType:
 *                 type: string
 *                 enum: [image/png, image/jpeg, application/pdf]
 *               fileSize:
 *                 type: number
 *                 description: File size in bytes
 *             required:
 *               - fileUrl
 *               - fileType
 *     responses:
 *       200:
 *         description: Payment proof uploaded successfully
 *       400:
 *         description: Invalid file or transfer not found
 *       401:
 *         description: Authentication required
 */
router.post('/:id/upload-proof', authenticateToken, transferLimiter, transferController.uploadPaymentProof);

/**
 * @swagger
 * /api/transfers/{id}/verify-proof:
 *   post:
 *     summary: Verify payment proof (Admin)
 *     description: Admin endpoint to verify or reject uploaded payment proof
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approved:
 *                 type: boolean
 *                 description: Whether the proof is approved
 *               notes:
 *                 type: string
 *                 description: Admin notes (required if rejected)
 *             required:
 *               - approved
 *     responses:
 *       200:
 *         description: Proof verification processed
 *       400:
 *         description: Invalid request or transfer not found
 *       401:
 *         description: Authentication or admin access required
 */
router.post('/:id/verify-proof', authenticateToken, requireAdmin, transferLimiter, transferController.verifyPaymentProof);

// ============ ADMIN ROUTES ============


/**
 * @swagger
 * /api/transfers/admin/all:
 *   get:
 *     summary: Get all transfers (Admin)
 *     description: Get paginated list of all transfers with optional status filter
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of transfers per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: All transfers retrieved successfully
 */
router.get('/admin/all', authenticateToken, requireAdmin, transferController.getAllTransfers);

/**
 * @swagger
 * /api/transfers/admin/statistics:
 *   get:
 *     summary: Get transfer statistics (Admin)
 *     description: Get comprehensive statistics about transfers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transfer statistics
 */
router.get('/admin/statistics', authenticateToken, requireAdmin, transferController.getStatistics);

/**
 * @swagger
 * /api/transfers/admin/{transferId}/process-mtn:
 *   post:
 *     summary: Process MTN disbursement manually (Admin)
 *     description: Manually trigger MTN disbursement for a transfer (for failed auto-processing)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID
 *     responses:
 *       200:
 *         description: MTN disbursement processed successfully
 */
router.post('/admin/:transferId/process-mtn', authenticateToken, requireAdmin, transferController.processMTNDisbursement);

/**
 * @swagger
 * /api/transfers/admin/awaiting-approval:
 *   get:
 *     summary: Get transfers awaiting admin approval (Admin)
 *     description: Get list of transfers that have been paid and are awaiting admin approval
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Transfers awaiting approval retrieved successfully
 */
router.get('/admin/awaiting-approval', authenticateToken, requireAdmin, transferController.getTransfersAwaitingApproval);

/**
 * @swagger
 * /api/transfers/admin/{transferId}/approve-payment:
 *   post:
 *     summary: Approve payment and mark transfer completed (Admin)
 *     description: Admin approves the Sberbank payment. Rwanda MTN payout should be processed manually outside the system.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes:
 *                 type: string
 *                 example: "Payment verified, MTN payout processed"
 *     responses:
 *       200:
 *         description: Payment approved successfully
 */
router.post('/admin/:transferId/approve-payment', authenticateToken, requireAdmin, transferController.approvePayment);

/**
 * @swagger
 * /api/transfers/admin/{transferId}/reject-payment:
 *   post:
 *     summary: Reject payment (Admin)
 *     description: Admin rejects the payment with a reason
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Payment amount does not match"
 *     responses:
 *       200:
 *         description: Payment rejected successfully
 */
router.post('/admin/:transferId/reject-payment', authenticateToken, requireAdmin, transferController.rejectPayment);

/**
 * @swagger
 * /api/transfers/admin/create:
 *   post:
 *     summary: Admin creates transfer for a user
 *     description: Admin creates a transfer order on behalf of a specific user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetUserId
 *               - recipientName
 *               - recipientPhone
 *               - sendAmount
 *             properties:
 *               targetUserId:
 *                 type: string
 *               recipientName:
 *                 type: string
 *               recipientPhone:
 *                 type: string
 *               sendAmount:
 *                 type: number
 *               direction:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transfer created successfully
 */
router.post('/admin/create', authenticateToken, requireAdmin, transferController.adminCreateTransferOrder);

export default router;