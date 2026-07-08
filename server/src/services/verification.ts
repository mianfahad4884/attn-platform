import { createHmac, randomUUID } from 'node:crypto';
import type { VerificationJob } from '../types/index.js';
import {
  verificationJobs,
  processedNonces,
  users,
  generateId,
} from '../models/store.js';
import * as ledger from './ledger.js';
import { getTierMultiplier } from './referral.js';
import { WEBHOOK_SECRET } from '../utils/index.js';
import { Decimal } from 'decimal.js';

const BASE_REWARD = 250_000; // 25 ATTN in minor units

/**
 * Generate the expected HMAC-SHA256 signature for a nonce.
 */
function signNonce(nonce: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(nonce).digest('hex');
}

/**
 * Start a verification job for the given user.
 * Simulates BullMQ: after 2 seconds the job auto-completes and fires the internal webhook.
 */
export function startVerification(userId: string): VerificationJob {
  const user = users.get(userId);
  if (!user) throw new Error('User not found');

  const multiplier = getTierMultiplier(userId);
  const netReward = new Decimal(BASE_REWARD).times(multiplier).floor().toNumber();
  const nonce = randomUUID();

  const job: VerificationJob = {
    id: generateId(),
    userId,
    status: 'PENDING',
    baseReward: BASE_REWARD,
    multiplier,
    netReward,
    nonce,
    startedAt: new Date(),
    completedAt: null,
  };

  verificationJobs.set(job.id, job);

  // Simulate queue processing — auto-complete after 2 seconds
  setTimeout(() => {
    job.status = 'PROCESSING';

    // Simulate webhook callback
    const signature = signNonce(nonce);
    const credited = processWebhook(nonce, signature);
    if (credited) {
      job.status = 'COMPLETED';
      job.completedAt = new Date();
    } else {
      // Nonce already processed (shouldn't happen on first run) or sig mismatch
      job.status = 'FAILED';
      job.completedAt = new Date();
    }
  }, 2000);

  return job;
}

/**
 * Process an ad-network webhook callback.
 * IDEMPOTENCY: if nonce was already processed, return false (no double-credit).
 * Verifies HMAC signature before crediting.
 */
export function processWebhook(nonce: string, signature: string): boolean {
  // Idempotency check
  if (processedNonces.has(nonce)) {
    return false;
  }

  // Verify signature
  const expected = signNonce(nonce);
  if (signature !== expected) {
    return false;
  }

  // Find the job with this nonce
  let targetJob: VerificationJob | null = null;
  for (const job of verificationJobs.values()) {
    if (job.nonce === nonce) {
      targetJob = job;
      break;
    }
  }

  if (!targetJob) {
    return false;
  }

  // Credit the user
  ledger.creditUser(
    targetJob.userId,
    targetJob.netReward,
    'VERIFICATION',
    targetJob.id,
    `Verification reward — ${targetJob.netReward} minor units (${targetJob.multiplier}x multiplier)`,
  );

  // Mark nonce as processed
  processedNonces.add(nonce);

  return true;
}

/**
 * Look up a verification job by ID.
 */
export function getJobStatus(jobId: string): VerificationJob | null {
  return verificationJobs.get(jobId) ?? null;
}
