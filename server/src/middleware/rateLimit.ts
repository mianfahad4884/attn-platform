import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { rateLimits } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_REQUESTS = 60;

/**
 * Create a Postgres-backed rate limiter middleware.
 * Supports stateless serverless environments.
 * @param maxRequests  Max requests allowed within the window (default: 60)
 * @param windowMs     Window size in milliseconds (default: 1 hour)
 */
export function rateLimit(maxRequests: number = DEFAULT_MAX_REQUESTS, windowMs: number = DEFAULT_WINDOW_MS) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const key = `${ip}:${req.baseUrl}${req.path}`;
      const now = new Date();
      const resetAt = new Date(now.getTime() + windowMs);

      // Using PostgreSQL upsert (ON CONFLICT) to handle concurrency and stateless environments.
      // If the current time is past the existing resetAt, we reset the count to 1 and update the resetAt.
      // Otherwise, we increment the count.
      const result = await db.insert(rateLimits)
        .values({ key, count: 1, resetAt })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: {
            count: sql`CASE WHEN rate_limits.reset_at < ${now.toISOString()} THEN 1 ELSE rate_limits.count + 1 END`,
            resetAt: sql`CASE WHEN rate_limits.reset_at < ${now.toISOString()} THEN ${resetAt.toISOString()} ELSE rate_limits.reset_at END`,
          },
        })
        .returning();

      const currentRecord = result[0];

      if (currentRecord && currentRecord.count > maxRequests) {
        res.status(429).json({
          error: 'Too many requests',
          retryAfterMs: currentRecord.resetAt.getTime() - now.getTime(),
        });
        return;
      }

      next();
    } catch (err) {
      console.error('Rate limit error:', err);
      // Fall open if database fails so we don't bring down the API completely
      next();
    }
  };
}
