export const REFERRAL_REWARD_PAISE = 10000;
export const MEN_REFERRAL_REWARD_PAISE = 5000;
export const REFERRAL_WITHDRAWAL_STEP_PAISE = 5000;
export function referralGroup(gender?: string): 'women' | 'men' | null {
  const value = String(gender || '').trim().toLowerCase();
  if (['female', 'woman', 'women', 'girl', 'ladies', 'f'].includes(value)) return 'women';
  if (['male', 'man', 'men', 'boy', 'm'].includes(value)) return 'men';
  return null;
}
export function referralRewardPaise(gender?: string): number {
  return referralGroup(gender) === 'women' ? REFERRAL_REWARD_PAISE : referralGroup(gender) === 'men' ? MEN_REFERRAL_REWARD_PAISE : 0;
}
export const REFERRAL_HOLD_DAYS = 30;
export const REFERRAL_MIN_WITHDRAWAL_PAISE = 100000;
