import { Router } from 'express';
import { createMembersRepository } from '../members/repository.js';
import { createGroupsRepository } from '../groups/repository.js';
import { createReportRepository } from '../report/repository.js';
import {
  TRAINER_COOKIE_NAME,
  isRequestTrainer,
  signTrainerToken,
  trainerCookieOptions,
  trainerPinMatches,
} from '../trainerAuth/cookie.js';
import {
  clearFailures,
  clientIp,
  isRateLimited,
  recordFailure,
} from '../clubUnlock/rateLimit.js';
import { isValidDateString } from '../checkin/validateCheckin.js';
import { DEFAULT_GROUP_ID } from '../sheets/constants.js';
import { SheetsError, sendSheetsError } from '../sheets/errors.js';

export function createTrainerRouter(config, sheetsAdapter, options = {}) {
  const router = Router();
  const members = createMembersRepository(sheetsAdapter);
  const groups = createGroupsRepository(sheetsAdapter, members, {
    defaultGroupName: options.defaultGroupName,
  });
  const report = createReportRepository(sheetsAdapter, members);

  router.post('/trainer/unlock', (req, res) => {
    const ip = clientIp(req);

    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'rate_limited' });
    }

    const pin = req.body?.pin;
    if (pin === undefined || pin === null || String(pin).length === 0) {
      return res.status(400).json({ error: 'invalid_format' });
    }

    if (!trainerPinMatches(String(pin), config.trainerPin)) {
      recordFailure(ip);
      return res.status(401).json({ error: 'invalid_pin' });
    }

    clearFailures(ip);
    const token = signTrainerToken(config);
    res.cookie(TRAINER_COOKIE_NAME, token, trainerCookieOptions(config));
    res.json({ ok: true });
  });

  router.get('/trainer/session', (req, res) => {
    res.json({ unlocked: isRequestTrainer(req, config) });
  });

  function requireTrainer(req, res, next) {
    if (isRequestTrainer(req, config)) {
      return next();
    }
    return res.status(401).json({ error: 'trainer_unlock_required' });
  }

  router.get('/trainer/groups', requireTrainer, async (_req, res) => {
    try {
      const all = await groups.listAllGroups();
      return res.status(200).json({ groups: all });
    } catch (err) {
      return handleTrainerRouteError(res, err);
    }
  });

  router.get('/trainer/report', requireTrainer, async (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date.trim() : '';
    if (!isValidDateString(date)) {
      return res.status(400).json({ error: 'invalid_date' });
    }
    const groupId =
      typeof req.query.groupId === 'string' && req.query.groupId.trim() !== ''
        ? req.query.groupId.trim()
        : DEFAULT_GROUP_ID;
    try {
      const result = await report.getCheckinsForDate({ groupId, date });
      return res.status(200).json(result);
    } catch (err) {
      return handleTrainerRouteError(res, err);
    }
  });

  return router;
}

function handleTrainerRouteError(res, err) {
  if (err instanceof SheetsError) {
    return sendSheetsError(res, err);
  }
  console.error('trainer route failed', err);
  return res.status(503).json({ error: 'sheets_unavailable' });
}
