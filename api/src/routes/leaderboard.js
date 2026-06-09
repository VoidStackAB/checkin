import { Router } from 'express';
import { createMembersRepository } from '../members/repository.js';
import { createLeaderboardRepository } from '../leaderboard/repository.js';
import { SheetsError, sendSheetsError } from '../sheets/errors.js';

export function createLeaderboardRouter(sheetsAdapter) {
  const router = Router();
  const members = createMembersRepository(sheetsAdapter);
  const leaderboard = createLeaderboardRepository(sheetsAdapter, members);

  router.get('/leaderboard', async (req, res) => {
    const groupId =
      typeof req.query?.groupId === 'string' && req.query.groupId.trim() !== ''
        ? req.query.groupId.trim()
        : undefined;
    try {
      const result = await leaderboard.getPublicLeaderboard(
        new Date(),
        groupId,
      );
      return res.status(200).json(result);
    } catch (err) {
      return handleLeaderboardRouteError(res, err);
    }
  });

  return router;
}

function handleLeaderboardRouteError(res, err) {
  if (err instanceof SheetsError) {
    return sendSheetsError(res, err);
  }
  console.error('leaderboard route failed', err);
  return res.status(503).json({ error: 'sheets_unavailable' });
}
