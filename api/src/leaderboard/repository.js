import { calendarYear } from '../time/clubCalendar.js';
import { CHECKINS_HEADERS } from '../sheets/constants.js';
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
  async function listYearCheckins(year) {
    const meta = await adapter.getCheckinsTabMeta(year);
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
    return adapter.listCheckinRows(year);
  }

  async function buildRankings(now = new Date()) {
    const members = await membersRepository.listMembers();
    const year = calendarYear(now);
    const checkinRows = await listYearCheckins(year);
    const counts = countCheckinsForMembers(members, checkinRows);
    return buildRankedMembers(members, counts);
  }

  async function getPublicLeaderboard(now = new Date()) {
    const ranked = await buildRankings(now);
    return { entries: getPublicLeaderboardEntries(ranked) };
  }

  async function getRankForMember(memberId, now = new Date()) {
    const ranked = await buildRankings(now);
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
