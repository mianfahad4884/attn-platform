import { Decimal } from 'decimal.js';
import { db } from '../db/index.js';
import { ledger, systemConfig } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { generateId } from '../models/store.js';

/**
 * Compute the current balance for a user by summing all their ledger entries.
 * CREDITs and ADJUSTMENTs are positive; DEBITs and FEEs are negative.
 */
export async function getBalance(userId: string): Promise<number> {
  const entries = await db.select().from(ledger).where(eq(ledger.userId, userId));
  let sum = new Decimal(0);
  for (const entry of entries) {
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
export async function creditUser(
  userId: string,
  amount: number,
  source: string,
  referenceId: string | null,
  description: string,
) {
  const currentBalance = await getBalance(userId);
  const newBalance = new Decimal(currentBalance).plus(amount).toNumber();

  const [entry] = await db.insert(ledger).values({
    id: generateId(),
    userId,
    type: 'CREDIT',
    amount,
    balanceAfter: newBalance,
    source,
    referenceId,
    description,
    createdAt: new Date(),
  }).returning();

  return entry;
}

/**
 * Append a DEBIT entry to the ledger. Throws if insufficient balance.
 */
export async function debitUser(
  userId: string,
  amount: number,
  source: string,
  referenceId: string | null,
  description: string,
) {
  const currentBalance = await getBalance(userId);
  if (currentBalance < amount) {
    throw new Error('Insufficient balance');
  }

  const newBalance = new Decimal(currentBalance).minus(amount).toNumber();

  const [entry] = await db.insert(ledger).values({
    id: generateId(),
    userId,
    type: 'DEBIT',
    amount,
    balanceAfter: newBalance,
    source,
    referenceId,
    description,
    createdAt: new Date(),
  }).returning();

  return entry;
}

/**
 * Append a FEE entry to the ledger.
 */
export async function recordFee(
  userId: string,
  amount: number,
  source: string,
  referenceId: string | null,
  description: string,
) {
  const currentBalance = await getBalance(userId);
  const newBalance = new Decimal(currentBalance).minus(amount).toNumber();

  const [entry] = await db.insert(ledger).values({
    id: generateId(),
    userId,
    type: 'FEE',
    amount,
    balanceAfter: newBalance,
    source,
    referenceId,
    description,
    createdAt: new Date(),
  }).returning();

  return entry;
}

/**
 * Append an ADJUSTMENT entry (positive credit).
 */
export async function adjustBalance(
  userId: string,
  amount: number,
  source: string,
  referenceId: string | null,
  description: string,
) {
  const currentBalance = await getBalance(userId);
  // Adjustments can be positive (credit-like) or negative; for negative we use debit.
  const newBalance = new Decimal(currentBalance).plus(amount).toNumber();

  const [entry] = await db.insert(ledger).values({
    id: generateId(),
    userId,
    type: 'ADJUSTMENT',
    amount: Math.abs(amount),
    balanceAfter: newBalance,
    source,
    referenceId,
    description,
    createdAt: new Date(),
  }).returning();

  return entry;
}

/**
 * Calculate withdrawal fee and net payout using decimal.js to avoid float drift.
 */
export async function calculateWithdrawalFee(amount: number): Promise<{ fee: number; netPayout: number }> {
  let [config] = await db.select().from(systemConfig).limit(1);
  if (!config) {
    config = { feePercentage: 5, withdrawalMinimum: 5000000, emergencyPause: false, pauseReason: null, pauseExpiresAt: null, updatedAt: new Date(), id: 1 };
  }

  const amountDec = new Decimal(amount);
  const feeDec = amountDec
    .times(new Decimal(config.feePercentage))
    .dividedBy(100)
    .floor(); // always integer minor units
  const netPayout = amountDec.minus(feeDec).toNumber();
  return { fee: feeDec.toNumber(), netPayout };
}

/**
 * Return all ledger entries for a user, sorted by date descending.
 */
export async function getUserLedger(userId: string) {
  return await db.select().from(ledger).where(eq(ledger.userId, userId)).orderBy(desc(ledger.createdAt));
}
