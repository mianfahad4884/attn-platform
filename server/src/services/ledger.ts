import { Decimal } from 'decimal.js';
import type { LedgerEntry } from '../types/index.js';
import {
  ledgerEntries,
  generateId,
  systemConfig,
} from '../models/store.js';

/**
 * Compute the current balance for a user by summing all their ledger entries.
 * CREDITs and ADJUSTMENTs are positive; DEBITs and FEEs are negative.
 */
export function getBalance(userId: string): number {
  let sum = new Decimal(0);
  for (const entry of ledgerEntries.values()) {
    if (entry.userId !== userId) continue;
    if (entry.type === 'CREDIT' || entry.type === 'ADJUSTMENT') {
      sum = sum.plus(entry.amount);
    } else {
      sum = sum.minus(entry.amount);
    }
  }
  return sum.toNumber();
}

/**
 * Append a CREDIT entry to the ledger.
 */
export function creditUser(
  userId: string,
  amount: number,
  source: LedgerEntry['source'],
  referenceId: string | null,
  description: string,
): LedgerEntry {
  const currentBalance = getBalance(userId);
  const newBalance = new Decimal(currentBalance).plus(amount).toNumber();

  const entry: LedgerEntry = {
    id: generateId(),
    userId,
    type: 'CREDIT',
    amount,
    balanceAfter: newBalance,
    source,
    referenceId,
    description,
    createdAt: new Date(),
  };

  ledgerEntries.set(entry.id, entry);
  return entry;
}

/**
 * Append a DEBIT entry to the ledger. Throws if insufficient balance.
 */
export function debitUser(
  userId: string,
  amount: number,
  source: LedgerEntry['source'],
  referenceId: string | null,
  description: string,
): LedgerEntry {
  const currentBalance = getBalance(userId);
  if (currentBalance < amount) {
    throw new Error('Insufficient balance');
  }

  const newBalance = new Decimal(currentBalance).minus(amount).toNumber();

  const entry: LedgerEntry = {
    id: generateId(),
    userId,
    type: 'DEBIT',
    amount,
    balanceAfter: newBalance,
    source,
    referenceId,
    description,
    createdAt: new Date(),
  };

  ledgerEntries.set(entry.id, entry);
  return entry;
}

/**
 * Append a FEE entry to the ledger.
 */
export function recordFee(
  userId: string,
  amount: number,
  source: LedgerEntry['source'],
  referenceId: string | null,
  description: string,
): LedgerEntry {
  const currentBalance = getBalance(userId);
  const newBalance = new Decimal(currentBalance).minus(amount).toNumber();

  const entry: LedgerEntry = {
    id: generateId(),
    userId,
    type: 'FEE',
    amount,
    balanceAfter: newBalance,
    source,
    referenceId,
    description,
    createdAt: new Date(),
  };

  ledgerEntries.set(entry.id, entry);
  return entry;
}

/**
 * Append an ADJUSTMENT entry (positive credit).
 */
export function adjustBalance(
  userId: string,
  amount: number,
  source: LedgerEntry['source'],
  referenceId: string | null,
  description: string,
): LedgerEntry {
  const currentBalance = getBalance(userId);
  // Adjustments can be positive (credit-like) or negative; for negative we use debit.
  const newBalance = new Decimal(currentBalance).plus(amount).toNumber();

  const entry: LedgerEntry = {
    id: generateId(),
    userId,
    type: 'ADJUSTMENT',
    amount: Math.abs(amount),
    balanceAfter: newBalance,
    source,
    referenceId,
    description,
    createdAt: new Date(),
  };

  ledgerEntries.set(entry.id, entry);
  return entry;
}

/**
 * Calculate withdrawal fee and net payout using decimal.js to avoid float drift.
 */
export function calculateWithdrawalFee(amount: number): { fee: number; netPayout: number } {
  const amountDec = new Decimal(amount);
  const feeDec = amountDec
    .times(new Decimal(systemConfig.feePercentage))
    .dividedBy(100)
    .floor(); // always integer minor units
  const netPayout = amountDec.minus(feeDec).toNumber();
  return { fee: feeDec.toNumber(), netPayout };
}

/**
 * Return all ledger entries for a user, sorted by date descending.
 */
export function getUserLedger(userId: string): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  for (const entry of ledgerEntries.values()) {
    if (entry.userId === userId) {
      entries.push(entry);
    }
  }
  return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
