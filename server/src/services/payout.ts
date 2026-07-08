import { db } from '../db/index.js';
import { withdrawals, users, systemConfig } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { generateId } from '../models/store.js';
import * as ledger from './ledger.js';

/**
 * Lazy emergency-pause check.
 * If pauseExpiresAt has passed, auto-unset the pause flag and return false.
 */
export async function isSystemPaused(): Promise<boolean> {
  const [config] = await db.select().from(systemConfig).limit(1);
  if (!config || !config.emergencyPause) return false;

  // If there's an expiry and it's in the past, auto-unset
  if (config.pauseExpiresAt && config.pauseExpiresAt.getTime() <= Date.now()) {
    await db.update(systemConfig)
      .set({
        emergencyPause: false,
        pauseReason: null,
        pauseExpiresAt: null,
        updatedAt: new Date()
      })
      .where(eq(systemConfig.id, 1));
    return false;
  }

  return true;
}

/**
 * Request a withdrawal.
 *
 * Validates: user active, system not paused, amount >= minimum, amount <= balance.
 * Calculates fee with decimal.js. Creates withdrawal record, DEBIT + FEE ledger entries.
 */
export async function requestWithdrawal(
  userId: string,
  amount: number,
  method: 'STRIPE' | 'CRYPTO',
) {
  // System pause check
  if (await isSystemPaused()) {
    throw new Error('System is currently paused for withdrawals');
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error('User not found');
  if (user.status !== 'ACTIVE') {
    throw new Error(`Account is ${user.status} — withdrawals are not allowed`);
  }

  const [config] = await db.select().from(systemConfig).limit(1);
  const minWithdrawal = config?.withdrawalMinimum ?? 5000000;
  const feePercentage = config?.feePercentage ?? 5;

  // Amount validations
  if (amount < minWithdrawal) {
    throw new Error(
      `Minimum withdrawal is ${minWithdrawal} minor units (${minWithdrawal / 10000} ATTN)`,
    );
  }

  const balance = await ledger.getBalance(userId);
  if (amount > balance) {
    throw new Error('Insufficient balance');
  }

  // Calculate fee
  const { fee, netPayout } = await ledger.calculateWithdrawalFee(amount);

  // Create withdrawal record
  const [withdrawal] = await db.insert(withdrawals).values({
    id: generateId(),
    userId,
    amount,
    fee,
    netPayout,
    method,
    status: 'PENDING',
    createdAt: new Date(),
  }).returning();

  if (!withdrawal) throw new Error('Failed to create withdrawal record');

  // Debit the net amount from user's balance
  await ledger.debitUser(
    userId,
    netPayout,
    'WITHDRAWAL',
    withdrawal.id,
    `Withdrawal — ${amount} minor units via ${method}`,
  );

  // Record fee as separate ledger entry
  await ledger.recordFee(
    userId,
    fee,
    'WITHDRAWAL',
    withdrawal.id,
    `Withdrawal fee (${feePercentage}%)`,
  );

  return withdrawal;
}

/**
 * Get all withdrawals for a user, sorted by date descending.
 */
export async function getWithdrawals(userId: string) {
  return await db.select().from(withdrawals).where(eq(withdrawals.userId, userId)).orderBy(desc(withdrawals.createdAt));
}
