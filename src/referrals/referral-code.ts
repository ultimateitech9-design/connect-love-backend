import { randomBytes } from 'crypto';

export const LEGACY_REFERRAL_CODE = /^[a-f0-9]{24}$/;
export const REFERRAL_CODE_PATTERN = /^(?:[a-f0-9]{24}|[a-z0-9]{1,12}-[a-f0-9]{6})$/;

export function newReferralCode(name: string): string {
  const prefix = String(name || '').trim().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/\s+/)[0]
    .replace(/[^a-z0-9]/g, '').slice(0, 12) || 'member';
  return `${prefix}-${randomBytes(3).toString('hex')}`;
}
