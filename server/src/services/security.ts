/**
 * Validates a reCAPTCHA v3 token.
 */
export async function validateRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn('[Mock reCAPTCHA] Validation skipped because RECAPTCHA_SECRET_KEY is absent.');
    return true; // Fallback to pass
  }

  try {
    const res = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`, {
      method: 'POST',
    });
    const data = await res.json();
    return data.success === true && data.score >= 0.5;
  } catch (err) {
    console.error('reCAPTCHA validation failed:', err);
    return false;
  }
}

/**
 * Validates a FingerprintJS Pro requestId.
 */
export async function validateFingerprint(requestId: string): Promise<boolean> {
  const secret = process.env.FINGERPRINTJS_API_KEY;
  if (!secret) {
    console.warn('[Mock FingerprintJS] Validation skipped because FINGERPRINTJS_API_KEY is absent.');
    return true; // Fallback to pass
  }

  try {
    const res = await fetch(`https://api.fpjs.io/events/${requestId}`, {
      headers: { 'Auth-API-Key': secret }
    });
    const data = await res.json();
    // Simple mock validation check (e.g. check bot probability)
    if (data.products?.botd?.data?.bot?.result === 'bad') {
      return false;
    }
    return true;
  } catch (err) {
    console.error('Fingerprint validation failed:', err);
    return false;
  }
}
