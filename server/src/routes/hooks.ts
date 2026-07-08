import { Router } from 'express';
import { createHmac } from 'node:crypto';
import * as verificationService from '../services/verification.js';
import { WEBHOOK_SECRET } from '../utils/index.js';

const router = Router();

// ── POST /api/hooks/ad-callback ──────────────────────────────────────────────

router.post('/ad-callback', (req, res) => {
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

    const credited = verificationService.processWebhook(nonce, signature);

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

export default router;
