import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/index.js';
import { users } from '../models/store.js';

// ── Extend Express Request globally ──────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string };
      clientIp?: string;
    }
  }
}

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header (Bearer) or cookies.
 * Attaches decoded user to req.user and captures IP to req.clientIp.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Always capture IP server-side
  req.clientIp = req.ip || 'unknown';

  // Extract token
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken as string;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    
    // Guard: check actual user status in store
    const user = users.get(decoded.userId);
    if (!user || user.status === 'BANNED' || user.status === 'SUSPENDED') {
      res.status(403).json({ error: 'Account is banned or suspended' });
      return;
    }

    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
