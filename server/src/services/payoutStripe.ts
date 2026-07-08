import Stripe from 'stripe';
import { generateId } from '../models/store.js';

// Setup Stripe client if key is present
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any }) 
  : null;

/**
 * Initiates a Stripe payout.
 * Falls back to mock simulation if STRIPE_SECRET_KEY is absent.
 */
export async function initiateStripePayout(amountMinor: number, destination: string, currency: string = 'usd') {
  if (stripe) {
    // Real Stripe Integration
    const transfer = await stripe.transfers.create({
      amount: amountMinor,
      currency,
      destination, // connected account ID
      metadata: { source: 'attn-platform-withdrawal' }
    });
    return { success: true, externalId: transfer.id };
  } else {
    // Mock Simulation
    console.log(`[Mock Stripe] Transferring ${amountMinor} to ${destination}`);
    return { success: true, externalId: `mock_stripe_${generateId()}` };
  }
}
