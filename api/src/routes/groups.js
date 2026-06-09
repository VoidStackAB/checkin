import { Router } from 'express';
import { createMembersRepository } from '../members/repository.js';
import { createLeaderboardRepository } from '../leaderboard/repository.js';
import { createGroupsRepository } from '../groups/repository.js';
import { createCheckinRepository } from '../checkin/repository.js';
import { MemberNotFoundError } from '../checkin/errors.js';
import { GroupNotFoundError } from '../groups/errors.js';
import { parseMemberIdQuery } from '../checkin/validateCheckin.js';
import { SheetsError, sendSheetsError } from '../sheets/errors.js';

function parseGroupMembershipBody(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'invalid_format' };
  }
  const memberId =
    typeof body.memberId === 'string' ? body.memberId.trim() : '';
  const groupId = typeof body.groupId === 'string' ? body.groupId.trim() : '';
  if (!memberId || !groupId) {
    return { error: 'invalid_format' };
  }
  return { memberId, groupId };
}

export function createGroupsRouter(sheetsAdapter, options = {}) {
  const router = Router();
  const members = createMembersRepository(sheetsAdapter);
  const leaderboard = createLeaderboardRepository(sheetsAdapter, members);
  const groups = createGroupsRepository(sheetsAdapter, members, {
    defaultGroupName: options.defaultGroupName,
  });
  const checkins = createCheckinRepository(
    sheetsAdapter,
    members,
    leaderboard,
    groups,
  );

  router.get('/groups', async (_req, res) => {
    try {
      const all = await groups.listAllGroups();
      return res.status(200).json({ groups: all });
    } catch (err) {
      return handleGroupsRouteError(res, err);
    }
  });

  router.get('/me/groups', async (req, res) => {
    const parsed = parseMemberIdQuery(req.query);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    try {
      const result = await groups.getMemberGroups(parsed.memberId);
      return res.status(200).json(result);
    } catch (err) {
      return handleGroupsRouteError(res, err);
    }
  });

  router.post('/me/groups', async (req, res) => {
    const parsed = parseGroupMembershipBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    try {
      const result = await groups.joinGroup(parsed.memberId, parsed.groupId);
      return res.status(200).json(result);
    } catch (err) {
      return handleGroupsRouteError(res, err);
    }
  });

  router.delete('/me/groups', async (req, res) => {
    const parsed = parseGroupMembershipBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    try {
      const result = await groups.leaveGroup(parsed.memberId, parsed.groupId);
      return res.status(200).json(result);
    } catch (err) {
      return handleGroupsRouteError(res, err);
    }
  });

  router.get('/me/group-checkins', async (req, res) => {
    const parsed = parseMemberIdQuery(req.query);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    try {
      const memberGroups = await groups.getMemberCheckinGroups(parsed.memberId);
      const summaries = await checkins.getGroupCheckinSummaries(
        parsed.memberId,
        memberGroups,
      );
      return res.status(200).json({ groups: summaries });
    } catch (err) {
      return handleGroupsRouteError(res, err);
    }
  });

  return router;
}

function handleGroupsRouteError(res, err) {
  if (err instanceof MemberNotFoundError) {
    return res.status(404).json({ error: err.code });
  }
  if (err instanceof GroupNotFoundError) {
    return res.status(404).json({ error: err.code });
  }
  if (err instanceof SheetsError) {
    return sendSheetsError(res, err);
  }
  console.error('groups route failed', err);
  return res.status(503).json({ error: 'sheets_unavailable' });
}
