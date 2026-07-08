import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { users } from '../models/store.js';
import * as referralService from '../services/referral.js';

const router = Router();

// All referral routes require authentication
router.use(authenticate);

// ── GET /api/referrals/tree ──────────────────────────────────────────────────

router.get('/tree', (req, res) => {
  try {
    const maxDepth = parseInt(req.query.maxDepth as string) || 3;
    const tree = referralService.getReferralTree(req.user!.userId, maxDepth);

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

router.get('/stats', (req, res) => {
  try {
    const stats = referralService.getReferralStats(req.user!.userId);
    const tierInfo = referralService.calculateTier(req.user!.userId);
    res.json({ ...stats, tier: tierInfo });
  } catch (err) {
    console.error('Referral stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/referrals/code ──────────────────────────────────────────────────

router.get('/code', (req, res) => {
  try {
    const user = users.get(req.user!.userId);
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
