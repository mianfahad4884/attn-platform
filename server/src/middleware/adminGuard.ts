import type { Request, Response, NextFunction } from 'express';

/**
 * Admin guard middleware.
 * Must be used AFTER the authenticate middleware.
 * Checks that the authenticated user has the SUPER_ADMIN role.
 */
export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Forbidden — admin access required' });
    return;
  }
  next();
}
