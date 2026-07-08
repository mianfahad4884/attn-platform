export const JWT_SECRET = process.env.JWT_SECRET || 'attn-dev-secret-change-in-production';
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'attn-webhook-secret';
export const ATTN_UNIT = 10000;

/**
 * Format minor units to human-readable ATTN string.
 * e.g. 47500000 => "4750.0000 ATTN"
 */
export function formatATTN(minorUnits: number): string {
  const whole = Math.floor(Math.abs(minorUnits) / ATTN_UNIT);
  const frac = Math.abs(minorUnits) % ATTN_UNIT;
  const sign = minorUnits < 0 ? '-' : '';
  return `${sign}${whole}.${frac.toString().padStart(4, '0')} ATTN`;
}

/**
 * Sanitize user object — strip passwordHash before sending to client.
 */
export function sanitizeUser<T extends { passwordHash: string }>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash, ...safe } = user;
  return safe;
}
