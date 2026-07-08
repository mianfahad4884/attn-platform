import { createHmac, randomUUID } from 'node:crypto';
import type { VerificationJob } from '../types/index.js';
import { generateId } from '../models/store.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import * as ledger from './ledger.js';
import { getTierMultiplier } from './referral.js';
import { WEBHOOK_SECRET } from '../utils/index.js';
import { Decimal } from 'decimal.js';

const BASE_REWARD = 250_000; // 25 ATTN in minor units

// Simulated in-memory queue stores since schema doesn't have tables for these
export const verificationJobs = new Map<string, VerificationJob>();
export const processedNonces = new Set<string>();

/**
 * Generate the expected HMAC-SHA256 signature for a nonce.
 */
export function signNonce(nonce: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(nonce).digest('hex');
}

/**
 * Start a verification job for the given user.
 * Simulates BullMQ: after 2 seconds the job auto-completes and fires the internal webhook.
 */
export async function startVerification(userId: string): Promise<VerificationJob> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error('User not found');

  const multiplier = await getTierMultiplier(userId);
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
  setTimeout(async () => {
    job.status = 'PROCESSING';

    // Simulate webhook callback
    const signature = signNonce(nonce);
    const credited = await processWebhook(nonce, signature);
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
export async function processWebhook(nonce: string, signature: string): Promise<boolean> {
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
  await ledger.creditUser(
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
export async function getJobStatus(jobId: string): Promise<VerificationJob | null> {
  return verificationJobs.get(jobId) ?? null;
}

