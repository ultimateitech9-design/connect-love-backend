import type { User, UserPlan } from '../users/user.entity';

export type PlanEntitlements = {
  likesPerDay: number;
  messagesPerUser: number | null;
  matches: number;
  profilePhotos: number;
  videoCallsPerDay: number;
  sharedImagesPerMonth: number;
  superLikesPerMonth: number;
  rewindsPerMonth: number;
  firstImpressionsPerMonth: number;
  boostsPerMonth: number;
  voiceMessages: boolean;
  verifiedBadge: boolean;
  maxVideoCallMinutes: number;
};

export const PLAN_ENTITLEMENTS: Record<UserPlan, PlanEntitlements> = {
  free: { likesPerDay: 10, messagesPerUser: 10, matches: 2, profilePhotos: 2, videoCallsPerDay: 0, sharedImagesPerMonth: 0, superLikesPerMonth: 0, rewindsPerMonth: 0, firstImpressionsPerMonth: 0, boostsPerMonth: 0, voiceMessages: false, verifiedBadge: false, maxVideoCallMinutes: 0 },
  gold: { likesPerDay: 20, messagesPerUser: null, matches: Number.MAX_SAFE_INTEGER, profilePhotos: 5, videoCallsPerDay: 5, sharedImagesPerMonth: 10, superLikesPerMonth: 5, rewindsPerMonth: 2, firstImpressionsPerMonth: 5, boostsPerMonth: 2, voiceMessages: true, verifiedBadge: true, maxVideoCallMinutes: 60 },
  platinum: { likesPerDay: 40, messagesPerUser: null, matches: Number.MAX_SAFE_INTEGER, profilePhotos: 10, videoCallsPerDay: 10, sharedImagesPerMonth: 20, superLikesPerMonth: 10, rewindsPerMonth: 5, firstImpressionsPerMonth: 10, boostsPerMonth: 4, voiceMessages: true, verifiedBadge: true, maxVideoCallMinutes: 120 },
};

const WOMEN_ENTITLEMENTS: PlanEntitlements = {
  likesPerDay: Number.MAX_SAFE_INTEGER,
  messagesPerUser: null,
  matches: Number.MAX_SAFE_INTEGER,
  profilePhotos: 10,
  videoCallsPerDay: Number.MAX_SAFE_INTEGER,
  sharedImagesPerMonth: Number.MAX_SAFE_INTEGER,
  superLikesPerMonth: Number.MAX_SAFE_INTEGER,
  rewindsPerMonth: Number.MAX_SAFE_INTEGER,
  firstImpressionsPerMonth: Number.MAX_SAFE_INTEGER,
  boostsPerMonth: Number.MAX_SAFE_INTEGER,
  voiceMessages: true,
  verifiedBadge: false,
  maxVideoCallMinutes: 0,
};

export function isWoman(user: Pick<User, 'gender'>): boolean {
  const gender = String(user.gender || '').trim().toLowerCase();
  return ['female', 'woman', 'women', 'girl', 'ladies', 'f'].includes(gender);
}

export function activePlan(user: Pick<User, 'plan' | 'planExpiresAt'>): UserPlan {
  return user.plan !== 'free' && user.planExpiresAt && user.planExpiresAt <= new Date() ? 'free' : user.plan;
}

export function entitlementsFor(user: Pick<User, 'plan' | 'planExpiresAt'> & Partial<Pick<User, 'gender'>>): PlanEntitlements {
  if (isWoman(user as Pick<User, 'gender'>)) {
    return { ...WOMEN_ENTITLEMENTS, verifiedBadge: PLAN_ENTITLEMENTS[activePlan(user)].verifiedBadge };
  }
  return PLAN_ENTITLEMENTS[activePlan(user)];
}

export function monthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** First day of the current month at midnight India time. */
export function monthStartIndia(): Date {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return new Date(`${value('year')}-${value('month')}-01T00:00:00+05:30`);
}

export function dayStart(): Date {
  // Plans are sold to the India audience; daily call and like allowances reset
  // together at midnight India time even when the API host runs in UTC.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return new Date(`${value('year')}-${value('month')}-${value('day')}T00:00:00+05:30`);
}
