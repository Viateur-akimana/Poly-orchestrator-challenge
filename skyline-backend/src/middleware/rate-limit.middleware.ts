/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and brute force attacks
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request, Response } from 'express';
import redis from '../config/redis';

const makeRedisStore = (prefix: string) =>
  new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<number>,
    prefix,
  });

const createRateLimitMessage = (message: string) => ({
  success: false,
  error: { message, code: 'RATE_LIMIT_EXCEEDED' }
});

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: createRateLimitMessage('Too many requests from this IP, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:general:'),
  skip: (req: Request) => {
    return req.path.includes('/auth/login') || req.path.includes('/auth/register');
  }
});

/**
 * Authentication rate limiter (login/register)
 * 5 failed attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: createRateLimitMessage('Too many authentication attempts, please try again later.'),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:auth:'),
});

/**
 * Transfer creation rate limiter
 * 10 transfers per hour per user
 */
export const transferLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: createRateLimitMessage('Transfer limit reached. Maximum 10 transfers per hour.'),
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:transfer:'),
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.userId;
    return userId || req.ip || 'unknown';
  },
});

/**
 * Strict rate limiter for sensitive operations
 * 3 requests per 5 minutes
 */
export const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: createRateLimitMessage('Too many attempts. Please wait before trying again.'),
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:strict:'),
});