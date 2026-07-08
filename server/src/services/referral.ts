import type { User, ReferralNode } from '../types/index.js';
import { users, verificationJobs } from '../models/store.js';
import * as ledger from './ledger.js';

const TIER_LABELS: Record<1 | 2 | 3, string> = { 1: 'NOVICE', 2: 'ADVOCATE', 3: 'ELITE' };
const TIER_MULTIPLIERS: Record<1 | 2 | 3, number> = { 1: 1.0, 2: 1.5, 3: 2.5 };

/**
 * Get users who were directly referred by `userId` AND have completed at least 1 verification.
 */
export function getDirectVerifiedReferrals(userId: string): User[] {
  const referrals: User[] = [];
  for (const user of users.values()) {
    if (user.referredBy !== userId) continue;
    // Check if this user has at least one COMPLETED verification job
    let hasVerification = false;
    for (const job of verificationJobs.values()) {
      if (job.userId === user.id && job.status === 'COMPLETED') {
        hasVerification = true;
        break;
      }
    }
    if (hasVerification) {
      referrals.push(user);
    }
  }
  return referrals;
}

/**
 * Calculate the tier for a user based on their count of direct verified referrals.
 */
export function calculateTier(userId: string): { tier: 1 | 2 | 3; label: string; multiplier: number } {
  const count = getDirectVerifiedReferrals(userId).length;
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
export function getTierMultiplier(userId: string): number {
  const user = users.get(userId);
  if (!user) return TIER_MULTIPLIERS[1];
  return TIER_MULTIPLIERS[user.tier];
}

/**
 * Build recursive referral tree for visualization.
 */
export function getReferralTree(userId: string, maxDepth: number = 3): ReferralNode | null {
  const user = users.get(userId);
  if (!user) return null;

  function buildNode(uid: string, depth: number): ReferralNode {
    const u = users.get(uid)!;
    const children: ReferralNode[] = [];

    if (depth < maxDepth) {
      for (const candidate of users.values()) {
        if (candidate.referredBy === uid) {
          children.push(buildNode(candidate.id, depth + 1));
        }
      }
    }

    return {
      userId: u.id,
      email: u.email,
      tier: u.tier,
      referralCode: u.referralCode,
      children,
    };
  }

  return buildNode(userId, 0);
}

/**
 * Compute aggregate referral stats for a user.
 */
export function getReferralStats(userId: string): {
  directCount: number;
  activeCount: number;
  totalEarnings: number;
} {
  let directCount = 0;
  let activeCount = 0;
  for (const user of users.values()) {
    if (user.referredBy !== userId) continue;
    directCount++;
    if (user.status === 'ACTIVE') activeCount++;
  }

  // Sum REFERRAL-source credits for this user
  const entries = ledger.getUserLedger(userId);
  let totalEarnings = 0;
  for (const e of entries) {
    if (e.source === 'REFERRAL' && (e.type === 'CREDIT' || e.type === 'ADJUSTMENT')) {
      totalEarnings += e.amount;
    }
  }

  return { directCount, activeCount, totalEarnings };
}
