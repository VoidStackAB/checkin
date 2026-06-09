import { calendarYear } from '../time/clubCalendar.js';
import {
  CHECKINS_HEADERS,
  DEFAULT_GROUP_ID,
  groupCheckinsTabTitle,
} from '../sheets/constants.js';
import { SheetsError } from '../sheets/errors.js';
import {
  buildRankedMembers,
  countCheckinsForMembers,
  getPersonalYearRank,
  getPublicLeaderboardEntries,
} from './compute.js';

function headersMatch(row, expected) {
  if (!row || row.length < expected.length) {
    return false;
  }
  return expected.every((h, i) => row[i] === h);
}

export function createLeaderboardRepository(adapter, membersRepository) {
  async function listGroupCheckins(groupId, year) {
    const title = groupCheckinsTabTitle(groupId, year);
    const meta = await adapter.getCheckinTabMeta(title);
    if (!meta.exists) {
      return [];
    }
    if (!headersMatch(meta.headers, CHECKINS_HEADERS)) {
      throw new SheetsError(
        'sheet_setup_invalid',
        503,
        'Check-ins tab headers do not match expected schema',
      );
    }
    return adapter.listCheckinRowsByTitle(title);
  }

  async function buildRankings(now = new Date(), groupId = DEFAULT_GROUP_ID) {
    const members = await membersRepository.listMembers();
    const year = calendarYear(now);
    const checkinRows = await listGroupCheckins(groupId, year);
    const counts = countCheckinsForMembers(members, checkinRows);
    return buildRankedMembers(members, counts);
  }

  async function getPublicLeaderboard(
    now = new Date(),
    groupId = DEFAULT_GROUP_ID,
  ) {
    const ranked = await buildRankings(now, groupId);
    return { entries: getPublicLeaderboardEntries(ranked) };
  }

  async function getRankForMember(
    memberId,
    now = new Date(),
    groupId = DEFAULT_GROUP_ID,
  ) {
    const ranked = await buildRankings(now, groupId);
    const rank = getPersonalYearRank(ranked, memberId);
    if (rank === null) {
      return null;
    }
    return rank;
  }

  return {
    buildRankings,
    getPublicLeaderboard,
    getRankForMember,
  };
}
