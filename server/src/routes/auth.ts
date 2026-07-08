import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateId, generateReferralCode } from '../models/store.js';
import { authenticate } from '../middleware/auth.js';
import * as ledger from '../services/ledger.js';
import { JWT_SECRET, sanitizeUser } from '../utils/index.js';
import type { User } from '../types/index.js';

const router = Router();

// ── Zod schemas ──────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function signAccessToken(user: User): string {
  return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
}

function signRefreshToken(user: User): string {
  return jwt.sign({ userId: user.id, role: user.role, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
}

// ── POST /api/auth/register ──────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { email, password, referralCode } = parsed.data;

    // Check email not taken
    const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // IP-based account cap (max 2 accounts per IP)
    const clientIp = req.ip || 'unknown';
    const ipMatches = await db.select().from(users).where(eq(users.ipAddress, clientIp));
    if (ipMatches.length >= 2) {
      res.status(403).json({ error: 'Account limit reached for this IP address' });
      return;
    }

    // Hash password with real argon2id
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    // Resolve referrer
    let referredBy: string | null = null;
    if (referralCode) {
      const [referrer] = await db.select().from(users).where(eq(users.referralCode, referralCode));
      if (referrer) {
        referredBy = referrer.id;
      } else {
        res.status(400).json({ error: 'Invalid referral code' });
        return;
      }
    }

    const now = new Date();
    const newUser = {
      id: generateId(),
      email: email.toLowerCase(),
      passwordHash,
      role: 'USER',
      tier: 1,
      deviceHash: null,
      ipAddress: clientIp,
      status: 'ACTIVE',
      referredBy,
      referralCode: generateReferralCode(),
      createdAt: now,
      updatedAt: now,
    };

    const [user] = await db.insert(users).values(newUser).returning();

    const accessToken = signAccessToken(user as User);
    const refreshToken = signRefreshToken(user as User);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      user: sanitizeUser(user as User),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { email, password } = parsed.data;

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password with argon2
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check user status
    if (user.status === 'BANNED') {
      res.status(403).json({ error: 'Account has been banned' });
      return;
    }
    if (user.status === 'SUSPENDED') {
      res.status(403).json({ error: 'Account is suspended' });
      return;
    }

    const accessToken = signAccessToken(user as User);
    const refreshToken = signRefreshToken(user as User);

    // Update IP on login
    const clientIp = req.ip || user.ipAddress;
    const [updatedUser] = await db.update(users)
      .set({ ipAddress: clientIp, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: sanitizeUser(updatedUser as User),
      accessToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/refresh ───────────────────────────────────────────────────

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; type?: string };
    if (decoded.type !== 'refresh') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const accessToken = signAccessToken(user as User);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const balance = await ledger.getBalance(user.id);
    res.json({
      user: sanitizeUser(user as User),
      balance,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
