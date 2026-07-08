import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import * as ledger from '../services/ledger.js';
import * as payoutService from '../services/payout.js';
import { formatATTN } from '../utils/index.js';

const router = Router();

// All wallet routes require authentication
router.use(authenticate);

// ── GET /api/wallet/balance ──────────────────────────────────────────────────

router.get('/balance', (req, res) => {
  try {
    const balance = ledger.getBalance(req.user!.userId);
    res.json({
      balance,
      formatted: formatATTN(balance),
    });
  } catch (err) {
    console.error('Balance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/wallet/ledger ───────────────────────────────────────────────────

router.get('/ledger', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const allEntries = ledger.getUserLedger(req.user!.userId);
    const entries = allEntries.slice(offset, offset + limit);

    res.json({
      entries,
      pagination: {
        page,
        limit,
        total: allEntries.length,
        totalPages: Math.ceil(allEntries.length / limit),
      },
    });
  } catch (err) {
    console.error('Ledger error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/wallet/withdraw ────────────────────────────────────────────────

const withdrawSchema = z.object({
  amount: z.number().int().positive('Amount must be a positive integer (minor units)'),
  method: z.enum(['STRIPE', 'CRYPTO']),
});

router.post('/withdraw', (req, res) => {
  try {
    const parsed = withdrawSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { amount, method } = parsed.data;
    const withdrawal = payoutService.requestWithdrawal(req.user!.userId, amount, method);
    res.status(201).json({ withdrawal });
  } catch (err) {
    const message = (err as Error).message;
    // Known business-logic errors get 400
    if (
      message.includes('Insufficient') ||
      message.includes('Minimum') ||
      message.includes('paused') ||
      message.includes('not allowed') ||
      message.includes('not found')
    ) {
      res.status(400).json({ error: message });
      return;
    }
    console.error('Withdraw error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/wallet/withdrawals ──────────────────────────────────────────────

router.get('/withdrawals', (req, res) => {
  try {
    const history = payoutService.getWithdrawals(req.user!.userId);
    res.json({ withdrawals: history });
  } catch (err) {
    console.error('Withdrawals error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
