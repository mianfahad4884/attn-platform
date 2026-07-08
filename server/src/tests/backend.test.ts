import { describe, it, expect, beforeEach } from 'vitest';
import { calculateWithdrawalFee, creditUser, debitUser, getBalance } from '../services/ledger.js';
import { calculateTier } from '../services/referral.js';
import { processWebhook } from '../services/verification.js';
import { requestWithdrawal, isSystemPaused } from '../services/payout.js';
import * as store from '../models/store.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/index.js';
import { authenticate } from '../middleware/auth.js';

describe('ATTN Backend Unit Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    store.users.clear();
    store.ledgerEntries.clear();
    store.verificationJobs.clear();
    store.withdrawals.clear();
    store.auditLog.length = 0;
    store.processedNonces.clear();
    
    store.systemConfig.feePercentage = 5.00;
    store.systemConfig.withdrawalMinimum = 5000000;
    store.systemConfig.emergencyPause = false;
    store.systemConfig.pauseReason = null;
    store.systemConfig.pauseExpiresAt = null;

    // Setup test user
    store.users.set('test-user', {
      id: 'test-user',
      email: 'test@attn.io',
      passwordHash: 'hash',
      role: 'USER',
      tier: 1,
      deviceHash: 'device',
      ipAddress: '127.0.0.1',
      status: 'ACTIVE',
      referredBy: null,
      referralCode: 'TEST1234',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('Ledger & Float-free Math', () => {
    it('calculates withdrawal fee correctly without float drift', () => {
      // 1000 ATTN = 10000000 minor units, 5% fee
      const result = calculateWithdrawalFee(10000000);
      expect(result.fee).toBe(500000); // 50 ATTN
      expect(result.netPayout).toBe(9500000); // 950 ATTN
    });

    it('handles 0.1 + 0.2 float issues correctly in minor units', () => {
      // 0.1 ATTN = 1000 minor units
      // 0.2 ATTN = 2000 minor units
      creditUser('test-user', 1000, 'ADMIN_ADJUST', null, 'test');
      creditUser('test-user', 2000, 'ADMIN_ADJUST', null, 'test');
      expect(getBalance('test-user')).toBe(3000); // 0.3 ATTN exactly
    });
  });

  describe('Tier Multiplier Math', () => {
    it('calculates tier based on direct verified referrals', () => {
      const userIds = [];
      for(let i=0; i<12; i++) {
        const id = `ref-${i}`;
        userIds.push(id);
        store.users.set(id, {
          id, email: `ref${i}@attn.io`, passwordHash: 'hash', role: 'USER', tier: 1,
          deviceHash: 'device', ipAddress: '127.0.0.1', status: 'ACTIVE',
          referredBy: 'test-user', referralCode: `REF${i}`, createdAt: new Date(), updatedAt: new Date()
        });
      }

      // 0 verified -> Tier 1 (1.0x)
      expect(calculateTier('test-user').tier).toBe(1);
      expect(calculateTier('test-user').multiplier).toBe(1.0);

      // Verify 3 users -> Tier 2 (1.5x)
      for(let i=0; i<3; i++) {
        creditUser(userIds[i] as string, 250000, 'VERIFICATION', null, 'Verified');
        store.verificationJobs.set(`job-${i}`, { id: `job-${i}`, userId: userIds[i] as string, status: 'COMPLETED', baseReward: 250000, multiplier: 1, netReward: 250000, nonce: `${i}`, startedAt: new Date(), completedAt: new Date() });
      }
      expect(calculateTier('test-user').tier).toBe(2);
      expect(calculateTier('test-user').multiplier).toBe(1.5);

      // Verify 8 more (11 total) -> Tier 3 (2.5x)
      for(let i=3; i<11; i++) {
        creditUser(userIds[i] as string, 250000, 'VERIFICATION', null, 'Verified');
        store.verificationJobs.set(`job-${i}`, { id: `job-${i}`, userId: userIds[i] as string, status: 'COMPLETED', baseReward: 250000, multiplier: 1, netReward: 250000, nonce: `${i}`, startedAt: new Date(), completedAt: new Date() });
      }
      expect(calculateTier('test-user').tier).toBe(3);
      expect(calculateTier('test-user').multiplier).toBe(2.5);
    });
  });

  describe('Verification Webhook Idempotency', () => {
    it('prevents double-crediting for the same nonce', () => {
      const nonce = crypto.randomUUID();
      const secret = process.env.WEBHOOK_SECRET || 'attn-webhook-secret';
      const signature = crypto.createHmac('sha256', secret).update(nonce).digest('hex');

      // Create dummy job
      store.verificationJobs.set('job-1', {
        id: 'job-1', userId: 'test-user', status: 'PROCESSING',
        baseReward: 250000, multiplier: 1.0, netReward: 250000,
        nonce, startedAt: new Date(), completedAt: null
      });

      // First call should succeed
      expect(processWebhook(nonce, signature)).toBe(true);
      expect(getBalance('test-user')).toBe(250000);

      // Second call with same nonce should be rejected
      expect(processWebhook(nonce, signature)).toBe(false);
      expect(getBalance('test-user')).toBe(250000); // Balance hasn't changed
    });
  });

  describe('Withdrawal Minimum Gate', () => {
    it('rejects withdrawal below minimum threshold', () => {
      creditUser('test-user', 4000000, 'ADMIN_ADJUST', null, 'fund'); // 400 ATTN (below 500 min)
      
      expect(() => {
        requestWithdrawal('test-user', 4000000, 'STRIPE');
      }).toThrow('Minimum withdrawal is 5000000 minor units');
    });

    it('accepts withdrawal above minimum threshold', () => {
      creditUser('test-user', 6000000, 'ADMIN_ADJUST', null, 'fund'); // 600 ATTN
      const withdrawal = requestWithdrawal('test-user', 5000000, 'STRIPE'); // 500 ATTN
      
      expect(withdrawal.status).toBe('PENDING');
      expect(withdrawal.fee).toBe(250000); // 5% of 500 = 25
      expect(withdrawal.netPayout).toBe(4750000); // 475 ATTN
      expect(getBalance('test-user')).toBe(1000000); // 600 - 500 = 100 ATTN left
    });
  });

  describe('Emergency Pause Lazy Expiry', () => {
    it('returns true when paused and not expired', () => {
      store.systemConfig.emergencyPause = true;
      store.systemConfig.pauseExpiresAt = new Date(Date.now() + 100000); // future
      expect(isSystemPaused()).toBe(true);
    });

    it('returns false and unsets pause when expiry is in the past', () => {
      store.systemConfig.emergencyPause = true;
      store.systemConfig.pauseExpiresAt = new Date(Date.now() - 100000); // past
      
      expect(isSystemPaused()).toBe(false);
      expect(store.systemConfig.emergencyPause).toBe(false); // Unset lazily
    });

    it('returns false when not paused', () => {
      store.systemConfig.emergencyPause = false;
      store.systemConfig.pauseExpiresAt = null;
      expect(isSystemPaused()).toBe(false);
    });
  });

  describe('Banned User Guard', () => {
    it('rejects access at middleware level for BANNED users', () => {
      // Setup banned user
      store.users.set('banned-user', {
        ...store.users.get('test-user')!,
        id: 'banned-user',
        status: 'BANNED'
      });

      const token = jwt.sign({ userId: 'banned-user', role: 'USER' }, JWT_SECRET);
      const req = {
        ip: '127.0.0.1',
        headers: { authorization: `Bearer ${token}` }
      } as any;

      let statusCode = 0;
      let responseBody = null;
      const res = {
        status: (code: number) => { statusCode = code; return res; },
        json: (body: any) => { responseBody = body; }
      } as any;
      
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      authenticate(req, res, next);

      expect(nextCalled).toBe(false);
      expect(statusCode).toBe(403);
      expect(responseBody).toEqual({ error: 'Account is banned or suspended' });
    });
  });
});
