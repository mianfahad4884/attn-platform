export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'USER' | 'SUPER_ADMIN';
  tier: 1 | 2 | 3;
  deviceHash: string | null;
  ipAddress: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  referredBy: string | null;
  referralCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  type: 'CREDIT' | 'DEBIT' | 'FEE' | 'ADJUSTMENT';
  amount: number; // minor units (1 ATTN = 10000)
  balanceAfter: number;
  source: 'VERIFICATION' | 'WITHDRAWAL' | 'ADMIN_ADJUST' | 'REFERRAL';
  referenceId: string | null;
  description: string;
  createdAt: Date;
}

export interface VerificationJob {
  id: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  baseReward: number;
  multiplier: number;
  netReward: number;
  nonce: string;
  startedAt: Date;
  completedAt: Date | null;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  netPayout: number;
  method: 'STRIPE' | 'CRYPTO';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetUserId: string | null;
  reason: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

export interface SystemConfig {
  feePercentage: number; // e.g. 5.00
  withdrawalMinimum: number; // minor units
  emergencyPause: boolean;
  pauseReason: string | null;
  pauseExpiresAt: Date | null;
  updatedAt: Date;
}

export interface ReferralNode {
  userId: string;
  email: string;
  tier: 1 | 2 | 3;
  referralCode: string;
  children: ReferralNode[];
}
