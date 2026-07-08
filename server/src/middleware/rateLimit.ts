import type { Request, Response, NextFunction } from 'express';

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_REQUESTS = 60;

/**
 * Clean expired timestamps from a window entry.
 */
function cleanExpired(entry: WindowEntry, windowMs: number): void {
  const cutoff = Date.now() - windowMs;
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
}

/**
 * Create a sliding-window rate limiter middleware.
 * @param maxRequests  Max requests allowed within the window (default: 60)
 * @param windowMs     Window size in milliseconds (default: 1 hour)
 */
export function rateLimit(maxRequests: number = DEFAULT_MAX_REQUESTS, windowMs: number = DEFAULT_WINDOW_MS) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const key = `${ip}:${req.baseUrl}${req.path}`;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    cleanExpired(entry, windowMs);

    if (entry.timestamps.length >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfterMs: windowMs - (Date.now() - (entry.timestamps[0] ?? Date.now())),
      });
      return;
    }

    entry.timestamps.push(Date.now());
    next();
  };
}
