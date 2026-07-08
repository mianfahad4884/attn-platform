import type { ReferralNode } from '../types/index.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { verificationJobs } from './verification.js';
import * as ledger from './ledger.js';

const TIER_LABELS: Record<1 | 2 | 3, string> = { 1: 'NOVICE', 2: 'ADVOCATE', 3: 'ELITE' };
const TIER_MULTIPLIERS: Record<1 | 2 | 3, number> = { 1: 1.0, 2: 1.5, 3: 2.5 };

/**
 * Get users who were directly referred by `userId` AND have completed at least 1 verification.
 */
export async function getDirectVerifiedReferrals(userId: string) {
  const allReferrals = await db.select().from(users).where(eq(users.referredBy, userId));
  const verifiedReferrals = [];
  for (const user of allReferrals) {
    let hasVerification = false;
    for (const job of verificationJobs.values()) {
      if (job.userId === user.id && job.status === 'COMPLETED') {
        hasVerification = true;
        break;
      }
    }
    if (hasVerification) {
      verifiedReferrals.push(user);
    }
  }
  return verifiedReferrals;
}

/**
 * Calculate the tier for a user based on their count of direct verified referrals.
 */
export async function calculateTier(userId: string): Promise<{ tier: 1 | 2 | 3; label: string; multiplier: number }> {
  const count = (await getDirectVerifiedReferrals(userId)).length;
  let tier: 1 | 2 | 3;
  if (count >= 11) {
    tier = 3;
  } else if (count >= 3) {
    tier = 2;
  } else {
    tier = 1;
  }
  return { tier, label: TIER_LABELS[tier], multiplier: TIER_MULTIPLIERS[tier] };
}

/**
 * Get the tier multiplier for a user. Convenience accessor.
 */
export async function getTierMultiplier(userId: string): Promise<number> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return TIER_MULTIPLIERS[1];
  return TIER_MULTIPLIERS[user.tier as 1 | 2 | 3] ?? 1.0;
}

/**
 * Build recursive referral tree for visualization.
 */
export async function getReferralTree(userId: string, maxDepth: number = 3): Promise<ReferralNode | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;

  async function buildNode(uid: string, depth: number): Promise<ReferralNode> {
    const [u] = await db.select().from(users).where(eq(users.id, uid));
    if (!u) {
      throw new Error('User not found in referral tree');
    }
    const children: ReferralNode[] = [];

    if (depth < maxDepth) {
      const candidates = await db.select().from(users).where(eq(users.referredBy, uid));
      for (const candidate of candidates) {
        children.push(await buildNode(candidate.id, depth + 1));
      }
    }

    return {
      userId: u.id,
      email: u.email,
      tier: u.tier as 1 | 2 | 3,
      referralCode: u.referralCode,
      children,
    };
  }

  return await buildNode(userId, 0);
}

/**
 * Compute aggregate referral stats for a user.
 */
export async function getReferralStats(userId: string) {
  const allReferrals = await db.select().from(users).where(eq(users.referredBy, userId));
  const directCount = allReferrals.length;
  const activeCount = allReferrals.filter((u) => u.status === 'ACTIVE').length;

  const entries = await ledger.getUserLedger(userId);
  let totalEarnings = 0;
  for (const e of entries) {
    if (e.source === 'REFERRAL' && (e.type === 'CREDIT' || e.type === 'ADJUSTMENT')) {
      totalEarnings += e.amount;
    }
  }

  return { directCount, activeCount, totalEarnings };
}
