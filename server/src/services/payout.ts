import type { Withdrawal } from '../types/index.js';
import {
  withdrawals,
  users,
  systemConfig,
  generateId,
} from '../models/store.js';
import * as ledger from './ledger.js';

/**
 * Lazy emergency-pause check.
 * If pauseExpiresAt has passed, auto-unset the pause flag and return false.
 */
export function isSystemPaused(): boolean {
  if (!systemConfig.emergencyPause) return false;

  // If there's an expiry and it's in the past, auto-unset
  if (systemConfig.pauseExpiresAt && systemConfig.pauseExpiresAt.getTime() <= Date.now()) {
    systemConfig.emergencyPause = false;
    systemConfig.pauseReason = null;
    systemConfig.pauseExpiresAt = null;
    systemConfig.updatedAt = new Date();
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
export function requestWithdrawal(
  userId: string,
  amount: number,
  method: 'STRIPE' | 'CRYPTO',
): Withdrawal {
  // System pause check
  if (isSystemPaused()) {
    throw new Error('System is currently paused for withdrawals');
  }

  const user = users.get(userId);
  if (!user) throw new Error('User not found');
  if (user.status !== 'ACTIVE') {
    throw new Error(`Account is ${user.status} — withdrawals are not allowed`);
  }

  // Amount validations
  if (amount < systemConfig.withdrawalMinimum) {
    throw new Error(
      `Minimum withdrawal is ${systemConfig.withdrawalMinimum} minor units (${systemConfig.withdrawalMinimum / 10000} ATTN)`,
    );
  }

  const balance = ledger.getBalance(userId);
  if (amount > balance) {
    throw new Error('Insufficient balance');
  }

  // Calculate fee
  const { fee, netPayout } = ledger.calculateWithdrawalFee(amount);

  // Create withdrawal record
  const withdrawal: Withdrawal = {
    id: generateId(),
    userId,
    amount,
    fee,
    netPayout,
    method,
    status: 'PENDING',
    createdAt: new Date(),
  };

  withdrawals.set(withdrawal.id, withdrawal);

  // Debit the net amount from user's balance
  ledger.debitUser(
    userId,
    netPayout,
    'WITHDRAWAL',
    withdrawal.id,
    `Withdrawal — ${amount} minor units via ${method}`,
  );

  // Record fee as separate ledger entry
  ledger.recordFee(
    userId,
    fee,
    'WITHDRAWAL',
    withdrawal.id,
    `Withdrawal fee (${systemConfig.feePercentage}%)`,
  );

  return withdrawal;
}

/**
 * Get all withdrawals for a user, sorted by date descending.
 */
export function getWithdrawals(userId: string): Withdrawal[] {
  const result: Withdrawal[] = [];
  for (const w of withdrawals.values()) {
    if (w.userId === userId) result.push(w);
  }
  return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
