import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import authRoutes from './routes/auth.js';
import verifyRoutes from './routes/verify.js';
import walletRoutes from './routes/wallet.js';
import referralRoutes from './routes/referrals.js';
import adminRoutes from './routes/admin.js';
import hookRoutes from './routes/hooks.js';

const app = express();

// Initialize Sentry if configured
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

app.set('trust proxy', 1);

// Strict production helmet config
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false, // Prevents issues with CPX iframes
}));

// Lock CORS to production domain, with localhost fallback for dev
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];

app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hooks', hookRoutes);

// ── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    // Ping DB
    await db.execute(sql`SELECT 1`);
    
    res.json({
      status: 'UP',
      database: 'UP',
      environment: process.env.NODE_ENV || 'development',
      integrations: {
        sentry: !!process.env.SENTRY_DSN,
        stripe: !!process.env.STRIPE_SECRET_KEY,
        coinbase: !!process.env.COINBASE_COMMERCE_API_KEY,
        recaptcha: !!process.env.RECAPTCHA_SECRET_KEY,
        fingerprint: !!process.env.FINGERPRINTJS_API_KEY,
        email: !!process.env.EMAIL_API_KEY,
        cpx: !!process.env.CPX_API_KEY,
        kyc: !!process.env.KYC_PROVIDER_API_KEY,
      }
    });
  } catch (err) {
    res.status(503).json({ status: 'DOWN', database: 'DOWN' });
  }
});

// Global error handler
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!process.env.SENTRY_DSN) {
    console.error(err.stack);
  }
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
