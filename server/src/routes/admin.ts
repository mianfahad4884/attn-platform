import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { adminGuard } from '../middleware/adminGuard.js';
import {
  users,
  auditLog,
  systemConfig,
  ledgerEntries,
  withdrawals,
  generateId,
} from '../models/store.js';
import * as ledger from '../services/ledger.js';
import { sanitizeUser } from '../utils/index.js';
import type { AuditLogEntry } from '../types/index.js';

const router = Router();

// All admin routes require authentication + admin guard
router.use(authenticate, adminGuard);

// ── GET /api/admin/users ─────────────────────────────────────────────────────

router.get('/users', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const allUsers = Array.from(users.values());
    const paginatedUsers = allUsers.slice(offset, offset + limit);

    const usersWithBalances = paginatedUsers.map((u) => ({
      ...sanitizeUser(u),
      balance: ledger.getBalance(u.id),
    }));

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

router.post('/users/:id/ban', (req, res) => {
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
    const targetUser = users.get(req.params.id);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const previousStatus = targetUser.status;
    targetUser.status = status;
    targetUser.updatedAt = new Date();

    // Audit log
    const auditEntry: AuditLogEntry = {
      id: generateId(),
      adminId: req.user!.userId,
      action: status === 'BANNED' ? 'USER_BANNED' : 'USER_SUSPENDED',
      targetUserId: targetUser.id,
      reason,
      details: { previousStatus, newStatus: status },
      createdAt: new Date(),
    };
    auditLog.push(auditEntry);

    res.json({
      message: `User ${status.toLowerCase()} successfully`,
      user: sanitizeUser(targetUser),
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

router.post('/users/:id/adjust-balance', (req, res) => {
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
    const targetUser = users.get(req.params.id);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const beforeBalance = ledger.getBalance(targetUser.id);

    let entry;
    if (amount >= 0) {
      entry = ledger.adjustBalance(targetUser.id, amount, 'ADMIN_ADJUST', null, `Admin adjustment: ${reason}`);
    } else {
      entry = ledger.debitUser(targetUser.id, Math.abs(amount), 'ADMIN_ADJUST', null, `Admin adjustment: ${reason}`);
    }

    const afterBalance = ledger.getBalance(targetUser.id);

    // Audit log
    const auditEntry: AuditLogEntry = {
      id: generateId(),
      adminId: req.user!.userId,
      action: 'BALANCE_ADJUSTMENT',
      targetUserId: targetUser.id,
      reason,
      details: { amount, beforeBalance, afterBalance },
      createdAt: new Date(),
    };
    auditLog.push(auditEntry);

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

router.get('/audit-log', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    // Sort by date desc
    const sorted = [...auditLog].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const entries = sorted.slice(offset, offset + limit);

    res.json({
      entries,
      pagination: {
        page,
        limit,
        total: auditLog.length,
        totalPages: Math.ceil(auditLog.length / limit),
      },
    });
  } catch (err) {
    console.error('Audit log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/admin/analytics ─────────────────────────────────────────────────

router.get('/analytics', (req, res) => {
  try {
    const totalUsers = users.size;

    // Total ATTN minted = sum of all CREDIT entries (VERIFICATION + REFERRAL + ADMIN_ADJUST)
    let totalATTNMinted = 0;
    for (const entry of ledgerEntries.values()) {
      if (entry.type === 'CREDIT' || entry.type === 'ADJUSTMENT') {
        totalATTNMinted += entry.amount;
      }
    }

    // Total fees collected
    let totalFeesCollected = 0;
    for (const entry of ledgerEntries.values()) {
      if (entry.type === 'FEE') {
        totalFeesCollected += entry.amount;
      }
    }

    // Avg time to withdrawal (for completed withdrawals)
    let totalTimeMs = 0;
    let completedCount = 0;
    for (const w of withdrawals.values()) {
      if (w.status === 'COMPLETED') {
        // Find the user's creation time as a proxy for "start"
        const user = users.get(w.userId);
        if (user) {
          totalTimeMs += w.createdAt.getTime() - user.createdAt.getTime();
          completedCount++;
        }
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

router.post('/controls', (req, res) => {
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

    // Apply updates
    if (data.feePercentage !== undefined) systemConfig.feePercentage = data.feePercentage;
    if (data.withdrawalMinimum !== undefined) systemConfig.withdrawalMinimum = data.withdrawalMinimum;
    if (data.emergencyPause !== undefined) systemConfig.emergencyPause = data.emergencyPause;
    if (data.pauseReason !== undefined) systemConfig.pauseReason = data.pauseReason;
    if (data.pauseExpiresAt !== undefined) {
      systemConfig.pauseExpiresAt = data.pauseExpiresAt ? new Date(data.pauseExpiresAt) : null;
    }
    systemConfig.updatedAt = new Date();

    // Audit log
    const auditEntry: AuditLogEntry = {
      id: generateId(),
      adminId: req.user!.userId,
      action: 'SYSTEM_CONFIG_UPDATE',
      targetUserId: null,
      reason: data.emergencyPause ? (data.pauseReason || 'System control update') : 'System control update',
      details: { ...data },
      createdAt: new Date(),
    };
    auditLog.push(auditEntry);

    res.json({ config: systemConfig });
  } catch (err) {
    console.error('Admin controls error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/admin/controls ──────────────────────────────────────────────────

router.get('/controls', (_req, res) => {
  res.json({ config: systemConfig });
});

export default router;
