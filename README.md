# ATTN Platform

Attention Validation Platform built with React, Vite, Tailwind CSS, Express, and Drizzle ORM.

## Architecture & Deployment

This project is configured as a monorepo containing a Vite React frontend (`client/`) and a Serverless Node.js API (`server/`).
It is designed to be deployed to **Netlify** using Netlify Functions.

- **Frontend**: Vite + React + Zustand + Tailwind CSS
- **Backend API**: Node.js + Express wrapped in `serverless-http` (`/.netlify/functions/api`)
- **Database**: Drizzle ORM connecting to a hosted Postgres (e.g., Neon or Supabase)

### Going live — add these keys to enable real integrations

The system is designed with graceful mock fallbacks. If an environment variable is omitted, the corresponding feature will bypass the real integration and simulate success in the console. Add these keys to `.env` or your Netlify Environment Variables to enable real behavior:

- **`DATABASE_URL`**: (Required) Connection string for Postgres.
- **`STRIPE_SECRET_KEY`**: Enables real fiat payouts via Stripe.
- **`COINBASE_COMMERCE_API_KEY`**: Enables real crypto payouts.
- **`RECAPTCHA_SECRET_KEY`**: Enables real server-side reCAPTCHA token validation.
- **`FINGERPRINTJS_API_KEY`**: Enables real server-side hardware fingerprint checks.
- **`EMAIL_API_KEY`**: Enables real transactional emails via Resend.
- **`KYC_PROVIDER_API_KEY`**: Scaffold key to enable real KYC gates.

### Known Constraint: Background Jobs

Because Netlify Functions are stateless and terminate quickly, they **cannot** run persistent background workers (like BullMQ/Redis) reliably. 
The verification job queue is currently configured as a simulated synchronous operation (using `setTimeout`).

**Future Scaling Note:** To process real long-running jobs (like actual video view verification), you must deploy a separate worker dyno to an always-on host like Render or Railway, and configure the `REDIS_URL` environment variable.

## Development

```bash
# Setup both client and server
npm install
cd client && npm install
cd ../server && npm install

# Run database migrations
cd server
npx drizzle-kit push

# Start dev server (Netlify Dev is recommended for API proxying)
netlify dev
```
