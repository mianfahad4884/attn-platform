import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import * as verificationService from '../services/verification.js';
import { isSystemPaused } from '../services/payout.js';

const router = Router();

// All verify routes require authentication
router.use(authenticate);

// ── POST /api/verify/start ───────────────────────────────────────────────────

router.post('/start', rateLimit(10), async (req, res) => {
  try {
    // Check system pause
    if (await isSystemPaused()) {
      res.status(503).json({ error: 'System is currently paused — verifications are temporarily unavailable' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ error: `Account is ${user.status} — verification not allowed` });
      return;
    }

    const job = await verificationService.startVerification(user.id);
    res.status(201).json({ job });
  } catch (err) {
    console.error('Verify start error:', err);
    res.status(500).json({ error: (err as Error).message || 'Internal server error' });
  }
});

// ── GET /api/verify/status/:jobId ────────────────────────────────────────────

router.get('/status/:jobId', async (req, res) => {
  try {
    const job = await verificationService.getJobStatus(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    // Only allow user to see their own jobs
    if (job.userId !== req.user!.userId && req.user!.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ job });
  } catch (err) {
    console.error('Verify status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
