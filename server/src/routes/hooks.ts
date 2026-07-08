import { Router } from 'express';
import { createHmac } from 'node:crypto';
import * as verificationService from '../services/verification.js';
import * as ledger from '../services/ledger.js';
import { WEBHOOK_SECRET } from '../utils/index.js';
import { validateCPXSignature } from '../services/adProvider.js';
import { db } from '../db/index.js';
import { ledger as ledgerSchema, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// ── POST /api/hooks/ad-callback ──────────────────────────────────────────────

router.post('/ad-callback', async (req, res) => {
  try {
    const { nonce, signature } = req.body as { nonce?: string; signature?: string };

    if (!nonce || !signature) {
      res.status(400).json({ error: 'Missing nonce or signature' });
      return;
    }

    // Verify HMAC signature
    const expected = createHmac('sha256', WEBHOOK_SECRET).update(nonce).digest('hex');
    if (signature !== expected) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const credited = await verificationService.processWebhook(nonce, signature);

    if (!credited) {
      // Nonce already processed — idempotent 409
      res.status(409).json({ error: 'Duplicate nonce — already processed' });
      return;
    }

    res.status(200).json({ success: true, message: 'Callback processed' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET/POST /api/hooks/cpx ──────────────────────────────────────────────────
// CPX often uses GET for postbacks, but some configs use POST. We'll support both for safety.
router.all('/cpx', async (req, res) => {
  try {
    const payload = req.method === 'POST' ? req.body : req.query;
    const { trans_id, user_id, amount_local, hash } = payload as Record<string, string>;

    if (!trans_id || !user_id || !amount_local || !hash) {
      res.status(400).json({ error: 'Missing required CPX parameters' });
      return;
    }

    const cpxSecret = process.env.CPX_API_KEY;
    if (cpxSecret) {
      // Real validation
      const isValid = validateCPXSignature(payload, cpxSecret);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid signature hash' });
        return;
      }
    } else {
      // Fallback: accept mock if no key
      console.log(`[Mock CPX] Accepted mock postback trans_id=${trans_id}`);
    }

    // Idempotency: Check if trans_id already exists in ledger
    const existing = await db.select().from(ledgerSchema).where(
      and(
        eq(ledgerSchema.referenceId, `cpx_${trans_id}`),
        eq(ledgerSchema.type, 'CREDIT')
      )
    ).limit(1);

    if (existing.length > 0) {
      // Idempotent 200/409 - already credited, don't double credit, but tell CPX we got it
      res.status(200).send('OK - Duplicate');
      return;
    }

    // Convert CPX amount to minor units
    // e.g. amount_local = "500" -> 500 ATTN -> 5000000 minor units
    const rewardMinor = Math.floor(parseFloat(amount_local) * 10000);

    await ledger.creditUser(
      user_id,
      rewardMinor,
      'VERIFICATION',
      `cpx_${trans_id}`, // Store as referenceId to prevent replay
      `CPX Research Survey Reward (Tx: ${trans_id})`
    );

    res.status(200).send('OK');
  } catch (err) {
    console.error('CPX Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
