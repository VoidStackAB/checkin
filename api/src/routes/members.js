import { Router } from 'express';
import { createMembersRepository } from '../members/repository.js';
import { parseMemberNames } from '../members/validateNames.js';
import { SheetsError, sendSheetsError } from '../sheets/errors.js';

export function createMembersRouter(sheetsAdapter) {
  const router = Router();
  const members = createMembersRepository(sheetsAdapter);

  router.post('/members/match', async (req, res) => {
    const parsed = parseMemberNames(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    try {
      const result = await members.matchMembers(parsed);
      return res.status(200).json(result);
    } catch (err) {
      return handleMemberRouteError(res, err);
    }
  });

  router.post('/members', async (req, res) => {
    const parsed = parseMemberNames(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    try {
      const result = await members.createMember(parsed);
      return res.status(201).json(result);
    } catch (err) {
      return handleMemberRouteError(res, err, { create: true });
    }
  });

  return router;
}

function handleMemberRouteError(res, err, { create = false } = {}) {
  if (err instanceof SheetsError) {
    return sendSheetsError(res, err);
  }
  if (create) {
    console.error('createMember failed', err);
    return res.status(500).json({ error: 'member_create_failed' });
  }
  return res.status(503).json({ error: 'sheets_unavailable' });
}
