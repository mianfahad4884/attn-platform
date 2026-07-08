import { randomUUID, randomBytes } from 'node:crypto';

export function generateId(): string {
  return randomUUID();
}

export function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

