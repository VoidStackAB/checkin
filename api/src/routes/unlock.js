import { Router } from 'express';
import {
  COOKIE_NAME,
  cookieOptions,
  pinMatches,
  signUnlockToken,
} from '../clubUnlock/cookie.js';
import {
  clearFailures,
  clientIp,
  isRateLimited,
  recordFailure,
} from '../clubUnlock/rateLimit.js';

export function createUnlockRouter(config) {
  const router = Router();

  router.post('/unlock', (req, res) => {
    const ip = clientIp(req);

    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'rate_limited' });
    }

    const pin = req.body?.pin;
    if (pin === undefined || pin === null || String(pin).length === 0) {
      return res.status(400).json({ error: 'invalid_format' });
    }

    const submitted = String(pin);
    if (!pinMatches(submitted, config.clubPin)) {
      recordFailure(ip);
      return res.status(401).json({ error: 'invalid_pin' });
    }

    clearFailures(ip);
    const token = signUnlockToken(config);
    res.cookie(COOKIE_NAME, token, cookieOptions(config));
    res.json({ ok: true });
  });

  return router;
}
