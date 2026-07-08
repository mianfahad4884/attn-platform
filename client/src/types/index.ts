export interface User {
  id: string;
  email: string;
  role: 'USER' | 'SUPER_ADMIN';
  tier: 1 | 2 | 3;
  tierLabel: string;
  multiplier: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  referralCode: string;
  referredBy: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  type: 'CREDIT' | 'DEBIT' | 'FEE' | 'ADJUSTMENT';
  amount: number;
  balanceAfter: number;
  source: 'VERIFICATION' | 'WITHDRAWAL' | 'ADMIN_ADJUST' | 'REFERRAL';
  referenceId: string | null;
  description: string;
  createdAt: string;
}

export interface VerificationJob {
  id: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  baseReward: number;
  multiplier: number;
  netReward: number;
  startedAt: string;
  completedAt: string | null;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  netPayout: number;
  method: 'STRIPE' | 'CRYPTO';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface ReferralNode {
  id: string;
  email: string;
  tier: number;
  verified: boolean;
  children: ReferralNode[];
}

export interface SystemConfig {
  feePercentage: number;
  withdrawalMinimum: number;
  emergencyPause: boolean;
  pauseReason: string | null;
  pauseExpiresAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetUserId: string | null;
  reason: string;
  details: { before?: any; after?: any };
  createdAt: string;
}
