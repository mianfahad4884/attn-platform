import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import * as referralService from '../services/referral.js';

const router = Router();

// All referral routes require authentication
router.use(authenticate);

// ── GET /api/referrals/tree ──────────────────────────────────────────────────

router.get('/tree', async (req, res) => {
  try {
    const maxDepth = parseInt(req.query.maxDepth as string) || 3;
    const tree = await referralService.getReferralTree(req.user!.userId, maxDepth);

    if (!tree) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ tree });
  } catch (err) {
    console.error('Referral tree error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/referrals/stats ─────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const stats = await referralService.getReferralStats(req.user!.userId);
    const tierInfo = await referralService.calculateTier(req.user!.userId);
    res.json({ ...stats, tier: tierInfo });
  } catch (err) {
    console.error('Referral stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/referrals/code ──────────────────────────────────────────────────

router.get('/code', async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ referralCode: user.referralCode });
  } catch (err) {
    console.error('Referral code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
