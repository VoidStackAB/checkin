import { Router } from 'express';
import { createMembersRepository } from '../members/repository.js';
import { createLeaderboardRepository } from '../leaderboard/repository.js';
import { createCheckinRepository } from '../checkin/repository.js';
import { MemberNotFoundError } from '../checkin/errors.js';
import {
  parseCheckinBody,
  parseMemberIdQuery,
} from '../checkin/validateCheckin.js';
import { SheetsError, sendSheetsError } from '../sheets/errors.js';

export function createCheckinRouter(sheetsAdapter) {
  const router = Router();
  const members = createMembersRepository(sheetsAdapter);
  const leaderboard = createLeaderboardRepository(sheetsAdapter, members);
  const checkins = createCheckinRepository(
    sheetsAdapter,
    members,
    leaderboard,
  );

  router.post('/checkin', async (req, res) => {
    const parsed = parseCheckinBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    try {
      const result = await checkins.checkIn(parsed);
      return res.status(200).json(result);
    } catch (err) {
      return handleCheckinRouteError(res, err);
    }
  });

  router.get('/me/status', async (req, res) => {
    const parsed = parseMemberIdQuery(req.query);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    try {
      const result = await checkins.getStatus(parsed.memberId);
      return res.status(200).json(result);
    } catch (err) {
      return handleCheckinRouteError(res, err);
    }
  });

  return router;
}

function handleCheckinRouteError(res, err) {
  if (err instanceof MemberNotFoundError) {
    return res.status(404).json({ error: err.code });
  }
  if (err instanceof SheetsError) {
    return sendSheetsError(res, err);
  }
  console.error('checkin route failed', err);
  return res.status(503).json({ error: 'sheets_unavailable' });
}
