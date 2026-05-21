import fs from 'node:fs';
import path from 'node:path';

export const COOKIE_NAME = 'checkin_unlock';

export function loadConfig() {
  const clubPin = process.env.CLUB_PIN;
  const sessionSecret = process.env.SESSION_SECRET;
  const spreadsheetId = process.env.SPREADSHEET_ID?.trim();
  const googleServiceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT?.trim();

  const missing = [];
  if (!clubPin) missing.push('CLUB_PIN');
  if (!sessionSecret) missing.push('SESSION_SECRET');
  if (!spreadsheetId) missing.push('SPREADSHEET_ID');
  if (!googleServiceAccountPath) missing.push('GOOGLE_SERVICE_ACCOUNT');

  if (missing.length > 0) {
    console.error(
      `Missing required env: ${missing.join(', ')} (see .env.example)`,
    );
    process.exit(1);
  }

  const resolvedPath = path.resolve(googleServiceAccountPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(
      `GOOGLE_SERVICE_ACCOUNT file not found: ${resolvedPath}`,
    );
    process.exit(1);
  }

  const cookieSecure =
    process.env.NODE_ENV === 'production' ||
    process.env.COOKIE_SECURE === 'true';

  return {
    clubPin,
    sessionSecret,
    cookieSecure,
    spreadsheetId,
    googleServiceAccountPath: resolvedPath,
  };
}
