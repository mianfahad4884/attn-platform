import { randomUUID, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type {
  User,
  LedgerEntry,
  VerificationJob,
  Withdrawal,
  AuditLogEntry,
  SystemConfig,
} from '../types/index.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return randomUUID();
}

export function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase(); // 8-char hex
}

// ── Singleton store ──────────────────────────────────────────────────────────

export const users = new Map<string, User>();
export const ledgerEntries = new Map<string, LedgerEntry>();
export const verificationJobs = new Map<string, VerificationJob>();
export const withdrawals = new Map<string, Withdrawal>();
export const auditLog: AuditLogEntry[] = [];
export const processedNonces = new Set<string>();

export const systemConfig: SystemConfig = {
  feePercentage: 5.0,
  withdrawalMinimum: 5_000_000, // 500 ATTN
  emergencyPause: false,
  pauseReason: null,
  pauseExpiresAt: null,
  updatedAt: new Date(),
};

// ── getUserBalance ───────────────────────────────────────────────────────────

export function getUserBalance(userId: string): number {
  let sum = 0;
  for (const entry of ledgerEntries.values()) {
    if (entry.userId !== userId) continue;
    if (entry.type === 'CREDIT' || entry.type === 'ADJUSTMENT') {
      sum += entry.amount;
    } else {
      // DEBIT or FEE
      sum -= entry.amount;
    }
  }
  return sum;
}

// ── Seed data ────────────────────────────────────────────────────────────────

const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';
const ADMIN_USER_ID = '00000000-0000-4000-8000-000000000002';

export async function initStore(): Promise<void> {
  // ── Hash seed passwords with real argon2 ────────────────────────────────
  const demoHash = await argon2.hash('demo123', { type: argon2.argon2id });
  const adminHash = await argon2.hash('admin123', { type: argon2.argon2id });

  // ── Seed users ──────────────────────────────────────────────────────────
  const demoUser: User = {
    id: DEMO_USER_ID,
    email: 'demo@attn.io',
    passwordHash: demoHash,
    role: 'USER',
    tier: 2,
    deviceHash: null,
    ipAddress: '127.0.0.1',
    status: 'ACTIVE',
    referredBy: null,
    referralCode: 'DEMO1234',
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-07-01T10:00:00Z'),
  };

  const adminUser: User = {
    id: ADMIN_USER_ID,
    email: 'admin@attn.io',
    passwordHash: adminHash,
    role: 'SUPER_ADMIN',
    tier: 1,
    deviceHash: null,
    ipAddress: '127.0.0.1',
    status: 'ACTIVE',
    referredBy: null,
    referralCode: 'ADMN5678',
    createdAt: new Date('2026-05-15T08:00:00Z'),
    updatedAt: new Date('2026-07-01T08:00:00Z'),
  };

  users.set(demoUser.id, demoUser);
  users.set(adminUser.id, adminUser);

  // ── Seed ledger (15+ entries for demo user) ─────────────────────────────
  const seedLedger: Omit<LedgerEntry, 'id'>[] = [
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 2_500_000, balanceAfter: 2_500_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #1', createdAt: new Date('2026-06-02T09:00:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 2_500_000, balanceAfter: 5_000_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #2', createdAt: new Date('2026-06-03T11:30:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 8_750_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #3 (Tier 2)', createdAt: new Date('2026-06-05T14:15:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 12_500_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #4 (Tier 2)', createdAt: new Date('2026-06-07T10:45:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 1_250_000, balanceAfter: 13_750_000, source: 'REFERRAL', referenceId: null, description: 'Referral bonus — user abc signed up', createdAt: new Date('2026-06-08T16:00:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 17_500_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #5 (Tier 2)', createdAt: new Date('2026-06-10T09:20:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 21_250_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #6 (Tier 2)', createdAt: new Date('2026-06-12T13:00:00Z') },
    { userId: DEMO_USER_ID, type: 'DEBIT', amount: 5_000_000, balanceAfter: 16_250_000, source: 'WITHDRAWAL', referenceId: 'w-001', description: 'Withdrawal — 500 ATTN to Stripe', createdAt: new Date('2026-06-13T15:30:00Z') },
    { userId: DEMO_USER_ID, type: 'FEE', amount: 250_000, balanceAfter: 16_000_000, source: 'WITHDRAWAL', referenceId: 'w-001', description: 'Withdrawal fee (5%)', createdAt: new Date('2026-06-13T15:30:01Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 19_750_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #7 (Tier 2)', createdAt: new Date('2026-06-15T11:00:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 23_500_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #8 (Tier 2)', createdAt: new Date('2026-06-18T14:00:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 27_250_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #9 (Tier 2)', createdAt: new Date('2026-06-20T09:45:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 31_000_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #10 (Tier 2)', createdAt: new Date('2026-06-22T16:30:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 34_750_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #11 (Tier 2)', createdAt: new Date('2026-06-25T10:00:00Z') },
    { userId: DEMO_USER_ID, type: 'DEBIT', amount: 7_000_000, balanceAfter: 27_750_000, source: 'WITHDRAWAL', referenceId: 'w-002', description: 'Withdrawal — 700 ATTN to Crypto', createdAt: new Date('2026-06-26T12:00:00Z') },
    { userId: DEMO_USER_ID, type: 'FEE', amount: 350_000, balanceAfter: 27_400_000, source: 'WITHDRAWAL', referenceId: 'w-002', description: 'Withdrawal fee (5%)', createdAt: new Date('2026-06-26T12:00:01Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 31_150_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #12 (Tier 2)', createdAt: new Date('2026-06-28T08:30:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 34_900_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #13 (Tier 2)', createdAt: new Date('2026-06-30T17:00:00Z') },
    { userId: DEMO_USER_ID, type: 'ADJUSTMENT', amount: 5_000_000, balanceAfter: 39_900_000, source: 'ADMIN_ADJUST', referenceId: null, description: 'Admin bonus — early adopter reward', createdAt: new Date('2026-07-01T10:00:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 43_650_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #14 (Tier 2)', createdAt: new Date('2026-07-03T11:00:00Z') },
    { userId: DEMO_USER_ID, type: 'CREDIT', amount: 3_750_000, balanceAfter: 47_400_000, source: 'VERIFICATION', referenceId: null, description: 'Verification reward #15 (Tier 2)', createdAt: new Date('2026-07-05T14:30:00Z') },
  ];

  for (const entry of seedLedger) {
    const id = generateId();
    ledgerEntries.set(id, { id, ...entry });
  }

  // ── Seed withdrawals ────────────────────────────────────────────────────
  const seedWithdrawals: Withdrawal[] = [
    { id: 'w-001', userId: DEMO_USER_ID, amount: 5_000_000, fee: 250_000, netPayout: 4_750_000, method: 'STRIPE', status: 'COMPLETED', createdAt: new Date('2026-06-13T15:30:00Z') },
    { id: 'w-002', userId: DEMO_USER_ID, amount: 7_000_000, fee: 350_000, netPayout: 6_650_000, method: 'CRYPTO', status: 'COMPLETED', createdAt: new Date('2026-06-26T12:00:00Z') },
    { id: 'w-003', userId: DEMO_USER_ID, amount: 5_000_000, fee: 250_000, netPayout: 4_750_000, method: 'STRIPE', status: 'PENDING', createdAt: new Date('2026-07-06T09:00:00Z') },
  ];

  for (const w of seedWithdrawals) {
    withdrawals.set(w.id, w);
  }

  // ── Seed audit log ──────────────────────────────────────────────────────
  auditLog.push(
    { id: generateId(), adminId: ADMIN_USER_ID, action: 'SYSTEM_CONFIG_UPDATE', targetUserId: null, reason: 'Initial configuration', details: { feePercentage: 5.0 }, createdAt: new Date('2026-05-15T08:05:00Z') },
    { id: generateId(), adminId: ADMIN_USER_ID, action: 'USER_CREATED', targetUserId: DEMO_USER_ID, reason: 'Demo account provisioning', details: { email: 'demo@attn.io' }, createdAt: new Date('2026-06-01T10:00:00Z') },
    { id: generateId(), adminId: ADMIN_USER_ID, action: 'BALANCE_ADJUSTMENT', targetUserId: DEMO_USER_ID, reason: 'Early adopter reward', details: { amount: 5_000_000, type: 'CREDIT' }, createdAt: new Date('2026-07-01T10:00:00Z') },
    { id: generateId(), adminId: ADMIN_USER_ID, action: 'SYSTEM_CONFIG_UPDATE', targetUserId: null, reason: 'Adjusted withdrawal minimum', details: { withdrawalMinimum: 5_000_000 }, createdAt: new Date('2026-07-02T08:00:00Z') },
    { id: generateId(), adminId: ADMIN_USER_ID, action: 'USER_REVIEW', targetUserId: DEMO_USER_ID, reason: 'Periodic account review — no issues', details: { result: 'PASS' }, createdAt: new Date('2026-07-04T15:00:00Z') },
  );

  console.log('[store] Seed data initialized — 2 users, 21 ledger entries, 3 withdrawals, 5 audit log entries');
}
