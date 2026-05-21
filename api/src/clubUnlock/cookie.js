import crypto from 'crypto';
import { COOKIE_NAME } from '../config.js';

export { COOKIE_NAME };

export function pinFingerprint(clubPin, sessionSecret) {
  return crypto
    .createHmac('sha256', sessionSecret)
    .update(clubPin, 'utf8')
    .digest('hex');
}

export function signUnlockToken(config) {
  const payload = {
    pinFingerprint: pinFingerprint(config.clubPin, config.sessionSecret),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyUnlockToken(token, config) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const dot = token.indexOf('.');
  if (dot <= 0) {
    return false;
  }

  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expectedSig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payloadB64)
    .digest('base64url');

  if (!timingSafeEqualString(sig, expectedSig)) {
    return false;
  }

  let payload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    );
  } catch {
    return false;
  }

  const current = pinFingerprint(config.clubPin, config.sessionSecret);
  return timingSafeEqualString(payload.pinFingerprint ?? '', current);
}

export function isRequestUnlocked(req, config) {
  return verifyUnlockToken(req.cookies?.[COOKIE_NAME], config);
}

export function cookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
  };
}

function timingSafeEqualString(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function pinMatches(submitted, expected) {
  const a = Buffer.from(submitted, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}
