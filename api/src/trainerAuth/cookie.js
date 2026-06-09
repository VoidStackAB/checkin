import crypto from 'crypto';
import { cookieOptions, pinMatches } from '../clubUnlock/cookie.js';

// Separate cookie from the club unlock so that holding the club PIN never
// grants access to the trainer-only report (which exposes other members'
// attendance).
export const TRAINER_COOKIE_NAME = 'checkin_trainer';

export { pinMatches as trainerPinMatches };

export function trainerCookieOptions(config) {
  return cookieOptions(config);
}

function trainerFingerprint(trainerPin, sessionSecret) {
  return crypto
    .createHmac('sha256', sessionSecret)
    .update(trainerPin, 'utf8')
    .digest('hex');
}

export function signTrainerToken(config) {
  const payload = {
    trainerFingerprint: trainerFingerprint(
      config.trainerPin,
      config.sessionSecret,
    ),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyTrainerToken(token, config) {
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

  const current = trainerFingerprint(config.trainerPin, config.sessionSecret);
  return timingSafeEqualString(payload.trainerFingerprint ?? '', current);
}

export function isRequestTrainer(req, config) {
  return verifyTrainerToken(req.cookies?.[TRAINER_COOKIE_NAME], config);
}

function timingSafeEqualString(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
