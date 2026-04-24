/**
 * User Controller
 * Handles admin user management operations
 */

import { Request, Response } from 'express';
import { prisma, ResponseHandler, createLogger } from '../lib';

const logger = createLogger('UserController');

export class UserController {
  /**
   * Get all users (admin only)
   */
  async getUsers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, search, status, role } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNum - 1) * limitNum;

      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { phoneNumber: { contains: search as string } },
        ];
      }

      if (status && status !== 'all') {
        where.status = status;
      }

      if (role && role !== 'all') {
        where.role = role;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            role: true,
            status: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { transferOrders: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limitNum,
        }),
        prisma.user.count({ where }),
      ]);

      return ResponseHandler.paginated(res, users, {
        page: pageNum,
        limit: limitNum,
        total,
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      return ResponseHandler.serverError(res, 'Failed to fetch users');
    }
  }

  /**
   * Get single user by ID (admin only)
   */
  async getUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          transferOrders: {
            select: {
              id: true,
              reference: true,
              sendAmount: true,
              receiveAmount: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: {
            select: { transferOrders: true },
          },
        },
      });

      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      return ResponseHandler.success(res, { user });
    } catch (error) {
      logger.error('Error fetching user:', error);
      return ResponseHandler.serverError(res, 'Failed to fetch user');
    }
  }

  /**
   * Suspend user (admin only)
   */
  async suspendUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).user?.id;

      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      if (user.role === 'ADMIN') {
        return ResponseHandler.error(res, 'Cannot suspend admin users', 403);
      }

      if (user.status === 'SUSPENDED') {
        return ResponseHandler.error(res, 'User is already suspended', 400);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          status: 'SUSPENDED',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      });

      logger.info(`User ${user.email} suspended by admin ${adminId}. Reason: ${reason || 'No reason provided'}`);

      return ResponseHandler.success(res, {
        message: 'User suspended successfully',
        user: updatedUser,
      });
    } catch (error) {
      logger.error('Error suspending user:', error);
      return ResponseHandler.serverError(res, 'Failed to suspend user');
    }
  }

  /**
   * Activate user (admin only)
   */
  async activateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;

      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      if (user.status === 'ACTIVE') {
        return ResponseHandler.error(res, 'User is already active', 400);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      });

      logger.info(`User ${user.email} activated by admin ${adminId}`);

      return ResponseHandler.success(res, {
        message: 'User activated successfully',
        user: updatedUser,
      });
    } catch (error) {
      logger.error('Error activating user:', error);
      return ResponseHandler.serverError(res, 'Failed to activate user');
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminId = (req as any).user?.id;

      if (!['USER', 'ADMIN'].includes(role)) {
        return ResponseHandler.validationError(res, 'Invalid role. Must be USER or ADMIN');
      }

      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      // Prevent demoting yourself
      if (id === adminId && role === 'USER') {
        return ResponseHandler.error(res, 'Cannot demote yourself', 403);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      logger.info(`User ${user.email} role changed to ${role} by admin ${adminId}`);

      return ResponseHandler.success(res, {
        message: `User role updated to ${role}`,
        user: updatedUser,
      });
    } catch (error) {
      logger.error('Error updating user role:', error);
      return ResponseHandler.serverError(res, 'Failed to update user role');
    }
  }

  /**
   * Get user statistics (admin only)
   */
  async getUserStats(req: Request, res: Response) {
    try {
      const [
        totalUsers,
        activeUsers,
        suspendedUsers,
        adminUsers,
        newUsersToday,
        verifiedUsers,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { status: 'SUSPENDED' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.user.count({ where: { emailVerified: true } }),
      ]);

      return ResponseHandler.success(res, {
        stats: {
          totalUsers,
          activeUsers,
          suspendedUsers,
          adminUsers,
          regularUsers: totalUsers - adminUsers,
          newUsersToday,
          verifiedUsers,
          unverifiedUsers: totalUsers - verifiedUsers,
        },
      });
    } catch (error) {
      logger.error('Error fetching user stats:', error);
      return ResponseHandler.serverError(res, 'Failed to fetch user statistics');
    }
  }
}

export const userController = new UserController();
