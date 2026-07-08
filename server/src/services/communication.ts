import { Resend } from 'resend';

const resend = process.env.EMAIL_API_KEY ? new Resend(process.env.EMAIL_API_KEY) : null;

/**
 * Sends a transactional email.
 * No-op if EMAIL_API_KEY is unset.
 */
export async function sendEmail(to: string, subject: string, html: string) {
  if (resend) {
    await resend.emails.send({
      from: 'ATTN Platform <noreply@attn.test>',
      to,
      subject,
      html
    });
  } else {
    console.log(`[Mock Email] Sent to ${to}: ${subject}`);
  }
}

/**
 * KYC Scaffold.
 * Validates a user's identity status.
 * Skips gate entirely if KYC_PROVIDER_API_KEY is unset.
 */
export async function checkIdentity(userId: string): Promise<boolean> {
  if (process.env.KYC_PROVIDER_API_KEY) {
    // Scaffold integration point for Persona / Stripe Identity
    // e.g. fetch user identity status from provider
    // const res = await fetch(`https://withpersona.com/api/v1/inquiries/${userId}...`);
    // return res.data.status === 'completed';
    return true; // placeholder for real implementation
  }
  
  // Skip gate if unset
  console.log(`[Mock KYC] Skipped KYC check for ${userId} because KYC_PROVIDER_API_KEY is absent`);
  return true;
}
