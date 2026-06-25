import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';

import { notificationService } from '../services/notification.service';

const router = Router();

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notifications count
 */
router.get('/unread-count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const count = await notificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      data: { count }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User notifications
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { read, limit, page } = req.query;
    
    const result = await notificationService.getUserNotifications(userId, {
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      page: page ? parseInt(page as string) : undefined
    });
    
    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/mark-read:
 *   patch:
 *     summary: Mark multiple notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 */
router.patch('/mark-read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'ids array is required' });
    }

    await notificationService.markAsRead(userId, ids);

    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    await notificationService.markAsRead(userId, [id]);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/mark-all-read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await notificationService.markAsRead(userId, []); // Empty array indicates all if implemented or just handle specifically
    
    // For now, let's just mark all as read for that user
    const { prisma } = require('../lib');
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(), status: 'READ' }
    });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags: [Notifications]
 */
router.get('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { prisma } = require('../lib');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true }
    });

    const DEFAULT_PREFERENCES = {
      email: true,
      sms: false,
      push: true,
      transferUpdates: true,
      promotions: false,
      security: true
    };

    res.json({
      success: true,
      data: user.notificationPreferences ? { ...DEFAULT_PREFERENCES, ...(user.notificationPreferences as object) } : DEFAULT_PREFERENCES
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check transfers
router.get('/debug/transfers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const transfers = await prisma.transferOrder.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { transfers, count: transfers.length }
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message,
      data: { transfers: [], count: 0 }
    });
  }
});

/**
 * @swagger
 * /api/notifications/simulate-mtn-message:
 *   post:
 *     summary: Simulate MTN notification message
 *     description: Simulate what MTN SMS notification would look like for testing
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, amount]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+250794797190"
 *               amount:
 *                 type: number
 *                 example: 50000
 *               reference:
 *                 type: string
 *                 example: "TRF20251103091"
 *     responses:
 *       200:
 *         description: MTN notification message simulated
 */
router.post('/simulate-mtn-message', async (req: Request, res: Response) => {
  try {
    const { phone, amount, reference } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Phone and amount are required'
      });
    }

    // Simulate MTN transaction ID
    const mtnTransactionId = `MTN${Date.now().toString().slice(-8)}`;
    const currentTimestamp = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Kigali',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Simulate current balance (random for demo)
    const simulatedBalance = Math.floor(Math.random() * 500000) + amount;

    const mtnMessage = {
      type: 'MTN_MOBILE_MONEY_NOTIFICATION',
      recipient: phone,
      message: `You have received ${amount.toLocaleString()} RWF from SKYLINE Transfers. Transaction ID: ${mtnTransactionId}. Your balance is ${simulatedBalance.toLocaleString()} RWF. Date: ${currentTimestamp}`,
      details: {
        transactionType: 'MONEY_RECEIVED',
        amount: amount,
        currency: 'RWF',
        sender: 'SKYLINE TRANSFERS',
        transactionId: mtnTransactionId,
        reference: reference || 'N/A',
        timestamp: new Date().toISOString(),
        balanceAfter: simulatedBalance,
        fee: 0,  // Usually no fee for receiving money
        status: 'SUCCESSFUL'
      },
      deliveryStatus: 'DELIVERED',
      simulationNote: 'This is a simulated MTN notification. In production, this would be sent as SMS to the recipient.'
    };

    res.json({
      success: true,
      data: {
        notification: mtnMessage,
        explanation: {
          whatHappens: 'In real MTN transactions, this message is automatically sent as SMS to the recipient',
          deliveryMethod: 'SMS to mobile phone',
          sender: 'MTN (Short code: 182)',
          timing: 'Immediately after successful transfer'
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/recent-for-phone:
 *   get:
 *     summary: Get recent notifications for a phone number
 *     description: Simulate getting recent MTN notifications for a specific phone
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *         example: "+250794797190"
 *     responses:
 *       200:
 *         description: Recent notifications for the phone number
 */
router.get('/recent-for-phone', async (req: Request, res: Response) => {
  try {
    const phone = req.query.phone as string;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Simulate recent transactions from database (in real scenario)
    const simulatedNotifications = [
      {
        id: 'notif_001',
        type: 'MONEY_RECEIVED',
        phone: phone,
        amount: 140000,
        sender: 'SKYLINE TRANSFERS',
        transactionId: 'MTN78901234',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        message: `You have received 140,000 RWF from SKYLINE Transfers. Transaction ID: MTN78901234. Your balance is 485,000 RWF.`,
        status: 'DELIVERED'
      },
      {
        id: 'notif_002',
        type: 'MONEY_RECEIVED',
        phone: phone,
        amount: 75000,
        sender: 'SKYLINE TRANSFERS',
        transactionId: 'MTN56789012',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        message: `You have received 75,000 RWF from SKYLINE Transfers. Transaction ID: MTN56789012. Your balance is 345,000 RWF.`,
        status: 'DELIVERED'
      }
    ];

    res.json({
      success: true,
      data: {
        phone: phone,
        notifications: simulatedNotifications,
        count: simulatedNotifications.length,
        note: 'These are simulated notifications showing what recipients would see'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/push/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     tags: [Notifications]
 */
router.post('/push/subscribe', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const subscription = req.body;
    
    await notificationService.subscribePush(userId, subscription);
    
    res.json({
      success: true,
      message: 'Subscribed to push notifications'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/push/unsubscribe:
 *   post:
 *     summary: Unsubscribe from push notifications
 *     tags: [Notifications]
 */
router.post('/push/unsubscribe', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { endpoint } = req.body;
    
    await notificationService.unsubscribePush(userId, endpoint);
    
    res.json({
      success: true,
      message: 'Unsubscribed from push notifications'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;