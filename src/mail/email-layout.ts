/**
 * Branded layout shared by every email sent to members: Connect Love logo
 * and name, the message, an optional button, and links to the website and
 * the Android app. Table-based with inline styles so it renders in Gmail,
 * Outlook and phone mail apps.
 */

export const SITE_URL = (process.env.PUBLIC_SITE_URL?.trim() || 'https://connectlove.in').replace(/\/$/, '');
export const PLAY_STORE_URL = process.env.PLAY_STORE_URL?.trim() || 'https://play.google.com/store/apps/details?id=com.connectlove';
// Always the public logo, so it shows even in emails sent from test setups.
const LOGO_URL = 'https://connectlove.in/connect-love-logo.png';

const BRAND = '#e11d48';
const BRAND_DARK = '#be123c';
const TEXT = '#1f2937';
const MUTED = '#6b7280';

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] as string
  ));
}

export type EmailContent = {
  /** Shown as the inbox preview line. */
  preheader: string;
  title: string;
  /** e.g. "Hi Priya," — escaped. */
  greeting?: string;
  /** Plain-text paragraphs (escaped). */
  paragraphs: string[];
  /** A highlighted box, e.g. an OTP code or an amount. */
  highlight?: { label: string; value: string; large?: boolean };
  /** Key/value rows, e.g. ticket or payout details. */
  details?: Array<{ label: string; value: string }>;
  button?: { label: string; url: string };
  /** Small print under the message, e.g. "Never share this code." */
  note?: string;
};

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const paragraphs = content.paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXT}">${escapeHtml(paragraph)}</p>`)
    .join('');

  const highlight = content.highlight
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 22px"><tr><td align="center" style="background:#fff1f2;border:1px solid #fecdd3;border-radius:14px;padding:18px 16px">
        <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND_DARK};font-weight:bold">${escapeHtml(content.highlight.label)}</div>
        <div style="margin-top:6px;font-size:${content.highlight.large ? '34px' : '22px'};${content.highlight.large ? 'letter-spacing:8px;' : ''}font-weight:bold;color:${TEXT}">${escapeHtml(content.highlight.value)}</div>
      </td></tr></table>`
    : '';

  const details = content.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate">${content.details.map((row, index) => `
        <tr><td style="padding:12px 16px;font-size:14px;color:${MUTED};${index ? 'border-top:1px solid #e5e7eb;' : ''}">${escapeHtml(row.label)}</td>
        <td align="right" style="padding:12px 16px;font-size:14px;font-weight:bold;color:${TEXT};${index ? 'border-top:1px solid #e5e7eb;' : ''}">${escapeHtml(row.value)}</td></tr>`).join('')}
      </table>`
    : '';

  const button = content.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 24px"><tr><td style="border-radius:999px;background:${BRAND}">
        <a href="${escapeHtml(content.button.url)}" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px">${escapeHtml(content.button.label)}</a>
      </td></tr></table>`
    : '';

  const note = content.note
    ? `<p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${MUTED}">${escapeHtml(content.note)}</p>`
    : '';

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.title)}</title></head>
<body style="margin:0;padding:0;background:#fdf2f8;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f8">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
    <tr><td align="center" style="padding:6px 0 22px">
      <a href="${SITE_URL}" style="text-decoration:none">
        <img src="${LOGO_URL}" width="56" height="56" alt="Connect Love" style="display:block;margin:0 auto;border:0;border-radius:16px">
        <div style="margin-top:10px;font-size:24px;font-weight:bold;color:${TEXT}">Connect<span style="color:${BRAND}">Love</span></div>
      </a>
    </td></tr>

    <tr><td style="background:#ffffff;border-radius:22px;padding:30px 24px;box-shadow:0 6px 24px rgba(225,29,72,0.08)">
      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:${TEXT}">${escapeHtml(content.title)}</h1>
      ${content.greeting ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXT}">${escapeHtml(content.greeting)}</p>` : ''}
      ${paragraphs}${highlight}${details}${button}${note}
    </td></tr>

    <tr><td style="padding:22px 0 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1f1235;border-radius:20px">
        <tr><td align="center" style="padding:24px 20px">
          <div style="font-size:17px;font-weight:bold;color:#ffffff">Connect Love is better in the app</div>
          <div style="margin:6px 0 16px;font-size:14px;line-height:1.5;color:#e9d5ff">Get instant message and call alerts on your phone.</div>
          <a href="${PLAY_STORE_URL}" style="display:inline-block;background:#ffffff;color:#111827;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:12px">&#9654;&nbsp; Get it on Google Play</a>
          <div style="margin-top:14px;font-size:13px"><a href="${SITE_URL}" style="color:#fbcfe8;text-decoration:underline">Or open connectlove.in</a></div>
        </td></tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:22px 16px 6px;font-size:12px;line-height:1.6;color:${MUTED}">
      Need help? <a href="${SITE_URL}/contact-us" style="color:${BRAND}">Contact us</a> · <a href="${SITE_URL}/safety" style="color:${BRAND}">Safety tips</a><br>
      You are receiving this email because of your Connect Love account.<br>
      &copy; ${new Date().getFullYear()} Connect Love
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

  const text = [
    'Connect Love',
    '',
    content.title,
    '',
    content.greeting,
    ...content.paragraphs,
    content.highlight ? `${content.highlight.label}: ${content.highlight.value}` : '',
    ...(content.details ?? []).map((row) => `${row.label}: ${row.value}`),
    content.button ? `${content.button.label}: ${content.button.url}` : '',
    content.note ?? '',
    '',
    `Get the Connect Love app: ${PLAY_STORE_URL}`,
    `Website: ${SITE_URL}`,
  ].filter((line) => line !== undefined).join('\n').replace(/\n{3,}/g, '\n\n');

  return { html, text };
}
