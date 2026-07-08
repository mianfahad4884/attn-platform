export const ATTN_DECIMALS = 4;
export const ATTN_UNIT = 10000;

export const tierLabels: Record<number, string> = {
  1: 'NOVICE',
  2: 'ADVOCATE',
  3: 'ELITE',
};

export const tierMultipliers: Record<number, number> = {
  1: 1.0,
  2: 1.5,
  3: 2.5,
};

export function formatATTN(minorUnits: number): string {
  const value = minorUnits / ATTN_UNIT;
  return value.toFixed(ATTN_DECIMALS);
}

export function formatATTNShort(minorUnits: number): string {
  const value = minorUnits / ATTN_UNIT;
  return value.toFixed(2);
}

export function formatATTNComma(minorUnits: number): string {
  const value = minorUnits / ATTN_UNIT;
  const parts = value.toFixed(ATTN_DECIMALS).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = String(d.getFullYear()).slice(2);
  return `${month}/${day}/${year}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export function truncateEmail(email: string, maxLength = 20): string {
  if (email.length <= maxLength) return email;
  const [local, domain] = email.split('@');
  const truncatedLocal = local.slice(0, maxLength - domain.length - 4) + '…';
  return `${truncatedLocal}@${domain}`;
}

export function truncateId(id: string, length = 8): string {
  return id.slice(0, length);
}
