function parseAllowedOrigins(): string[] {
  const configured = process.env.FRONTEND_ORIGINS
    || process.env.FRONTEND_URL
    || 'http://localhost:3002,https://connectlove.in,https://www.connectlove.in';
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (parseAllowedOrigins().includes(origin)) return true;

  // In local development the frontend is commonly opened from another device
  // through Next.js' Network URL (for example http://192.168.1.7:3002).
  if (process.env.NODE_ENV !== 'production') {
    return /^http:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):3002$/.test(origin);
  }

  return false;
}

