import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { adminGuard } from '../middleware/adminGuard.js';
import { db } from '../db/index.js';
import { users, auditLogs, systemConfig, ledger, withdrawals } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { generateId } from '../models/store.js';
import * as ledgerService from '../services/ledger.js';
import { sanitizeUser } from '../utils/index.js';
import type { User } from '../types/index.js';

const router = Router();

// All admin routes require authentication + admin guard
router.use(authenticate, adminGuard);

// ── GET /api/admin/users ─────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const allUsers = await db.select().from(users);
    const paginatedUsers = await db.select().from(users).offset(offset).limit(limit);

    const usersWithBalances = [];
    for (const u of paginatedUsers) {
      usersWithBalances.push({
        ...sanitizeUser(u as User),
        balance: await ledgerService.getBalance(u.id)
      });
    }

    res.json({
      users: usersWithBalances,
      pagination: {
        page,
        limit,
        total: allUsers.length,
        totalPages: Math.ceil(allUsers.length / limit),
      },
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/admin/users/:id/ban ────────────────────────────────────────────

const banSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  status: z.enum(['SUSPENDED', 'BANNED']),
});

router.post('/users/:id/ban', async (req, res) => {
  try {
    // Self-action guard
    if (req.user!.userId === req.params.id) {
      res.status(400).json({ error: 'Cannot perform this action on your own account' });
      return;
    }

    const parsed = banSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { reason, status } = parsed.data;
    const [targetUser] = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const previousStatus = targetUser.status;

    const [updatedUser] = await db.update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, targetUser.id))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      id: generateId(),
      adminId: req.user!.userId,
      action: status === 'BANNED' ? 'USER_BANNED' : 'USER_SUSPENDED',
      targetUserId: targetUser.id,
      reason,
      details: { previousStatus, newStatus: status },
      createdAt: new Date(),
    });

    res.json({
      message: `User ${status.toLowerCase()} successfully`,
      user: sanitizeUser(updatedUser as User),
    });
  } catch (err) {
    console.error('Admin ban error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/admin/users/:id/adjust-balance ─────────────────────────────────

const adjustSchema = z.object({
  amount: z.number().int('Amount must be an integer in minor units'),
  reason: z.string().min(1, 'Reason is required'),
});

router.post('/users/:id/adjust-balance', async (req, res) => {
  try {
    // Self-action guard
    if (req.user!.userId === req.params.id) {
      res.status(400).json({ error: 'Cannot adjust your own balance' });
      return;
    }

    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { amount, reason } = parsed.data;
    const [targetUser] = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const beforeBalance = await ledgerService.getBalance(targetUser.id);

    let entry;
    if (amount >= 0) {
      entry = await ledgerService.adjustBalance(targetUser.id, amount, 'ADMIN_ADJUST', null, `Admin adjustment: ${reason}`);
    } else {
      entry = await ledgerService.debitUser(targetUser.id, Math.abs(amount), 'ADMIN_ADJUST', null, `Admin adjustment: ${reason}`);
    }

    const afterBalance = await ledgerService.getBalance(targetUser.id);

    // Audit log
    await db.insert(auditLogs).values({
      id: generateId(),
      adminId: req.user!.userId,
      action: 'BALANCE_ADJUSTMENT',
      targetUserId: targetUser.id,
      reason,
      details: { amount, beforeBalance, afterBalance },
      createdAt: new Date(),
    });

    res.json({
      message: 'Balance adjusted successfully',
      ledgerEntry: entry,
      beforeBalance,
      afterBalance,
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('Insufficient')) {
      res.status(400).json({ error: message });
      return;
    }
    console.error('Admin adjust error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/admin/audit-log ─────────────────────────────────────────────────

router.get('/audit-log', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const allLogs = await db.select().from(auditLogs);
    const entries = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).offset(offset).limit(limit);

    res.json({
      entries,
      pagination: {
        page,
        limit,
        total: allLogs.length,
        totalPages: Math.ceil(allLogs.length / limit),
      },
    });
  } catch (err) {
    console.error('Audit log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/admin/analytics ─────────────────────────────────────────────────

router.get('/analytics', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;

    const allLedger = await db.select().from(ledger);
    let totalATTNMinted = 0;
    let totalFeesCollected = 0;
    for (const entry of allLedger) {
      if (entry.type === 'CREDIT' || entry.type === 'ADJUSTMENT') {
        totalATTNMinted += entry.amount;
      }
      if (entry.type === 'FEE') {
        totalFeesCollected += entry.amount;
      }
    }

    const allWithdrawals = await db.select().from(withdrawals).where(eq(withdrawals.status, 'COMPLETED'));
    let totalTimeMs = 0;
    let completedCount = 0;
    for (const w of allWithdrawals) {
      const [u] = await db.select().from(users).where(eq(users.id, w.userId));
      if (u) {
        totalTimeMs += w.createdAt.getTime() - u.createdAt.getTime();
        completedCount++;
      }
    }
    const avgTimeToWithdrawal = completedCount > 0 ? Math.round(totalTimeMs / completedCount / 1000) : 0; // in seconds

    res.json({
      totalUsers,
      totalATTNMinted,
      totalFeesCollected,
      avgTimeToWithdrawal,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/admin/controls ─────────────────────────────────────────────────

const controlsSchema = z.object({
  feePercentage: z.number().min(0).max(100).optional(),
  withdrawalMinimum: z.number().int().positive().optional(),
  emergencyPause: z.boolean().optional(),
  pauseReason: z.string().nullable().optional(),
  pauseExpiresAt: z.string().datetime().nullable().optional(),
});

router.post('/controls', async (req, res) => {
  try {
    const parsed = controlsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    // If enabling emergency pause, require reason and expiry
    if (data.emergencyPause === true) {
      if (!data.pauseReason) {
        res.status(400).json({ error: 'pauseReason is required when enabling emergency pause' });
        return;
      }
      if (!data.pauseExpiresAt) {
        res.status(400).json({ error: 'pauseExpiresAt is required when enabling emergency pause' });
        return;
      }
    }

    let [config] = await db.select().from(systemConfig).limit(1);
    if (!config) {
      [config] = await db.insert(systemConfig).values({}).returning();
    }
    if (!config) throw new Error('Failed to create system config');

    const updates: any = {};
    if (data.feePercentage !== undefined) updates.feePercentage = data.feePercentage;
    if (data.withdrawalMinimum !== undefined) updates.withdrawalMinimum = data.withdrawalMinimum;
    if (data.emergencyPause !== undefined) updates.emergencyPause = data.emergencyPause;
    if (data.pauseReason !== undefined) updates.pauseReason = data.pauseReason;
    if (data.pauseExpiresAt !== undefined) {
      updates.pauseExpiresAt = data.pauseExpiresAt ? new Date(data.pauseExpiresAt) : null;
    }
    updates.updatedAt = new Date();

    const [updatedConfig] = await db.update(systemConfig).set(updates).where(eq(systemConfig.id, config.id)).returning();

    // Audit log
    await db.insert(auditLogs).values({
      id: generateId(),
      adminId: req.user!.userId,
      action: 'SYSTEM_CONFIG_UPDATE',
      targetUserId: null,
      reason: data.emergencyPause ? (data.pauseReason || 'System control update') : 'System control update',
      details: { ...data },
      createdAt: new Date(),
    });

    res.json({ config: updatedConfig });
  } catch (err) {
    console.error('Admin controls error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/admin/controls ──────────────────────────────────────────────────

router.get('/controls', async (_req, res) => {
  let [config] = await db.select().from(systemConfig).limit(1);
  if (!config) {
    [config] = await db.insert(systemConfig).values({}).returning();
  }
  res.json({ config });
});

export default router;
