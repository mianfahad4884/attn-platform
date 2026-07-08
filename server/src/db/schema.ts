import { pgTable, text, timestamp, integer, boolean, real, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('USER'), // 'USER' | 'SUPER_ADMIN'
  tier: integer('tier').notNull().default(1),
  tierLabel: text('tier_label').notNull().default('NOVICE'),
  multiplier: real('multiplier').notNull().default(1.0),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'SUSPENDED' | 'BANNED'
  deviceHash: text('device_hash'),
  ipAddress: text('ip_address').notNull(),
  referralCode: text('referral_code').notNull().unique(),
  referredBy: text('referred_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLogin: timestamp('last_login'),
});

export const ledger = pgTable('ledger', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // 'CREDIT' | 'DEBIT' | 'FEE' | 'ADJUSTMENT'
  source: text('source').notNull(), // 'VERIFICATION' | 'REFERRAL' | 'WITHDRAWAL' | 'ADMIN_ADJUST'
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  description: text('description').notNull(),
  referenceId: text('reference_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const withdrawals = pgTable('withdrawals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(),
  fee: integer('fee').notNull(),
  netPayout: integer('net_payout').notNull(),
  method: text('method').notNull(), // 'STRIPE' | 'CRYPTO'
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  externalId: text('external_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  adminId: text('admin_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  targetUserId: text('target_user_id'),
  reason: text('reason').notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const systemConfig = pgTable('system_config', {
  id: integer('id').primaryKey().default(1),
  feePercentage: integer('fee_percentage').notNull().default(5),
  withdrawalMinimum: integer('withdrawal_minimum').notNull().default(5000000),
  emergencyPause: boolean('emergency_pause').notNull().default(false),
  pauseReason: text('pause_reason'),
  pauseExpiresAt: timestamp('pause_expires_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(1),
  resetAt: timestamp('reset_at').notNull(),
});
