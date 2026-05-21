export const COOKIE_NAME = 'checkin_unlock';

export function loadConfig() {
  const clubPin = process.env.CLUB_PIN;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!clubPin || !sessionSecret) {
    console.error(
      'Missing required env: CLUB_PIN and SESSION_SECRET (see .env.example)',
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
  };
}
