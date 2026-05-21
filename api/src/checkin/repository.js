import { calendarDateString, calendarYear } from '../time/clubCalendar.js';
import {
  CHECKINS_HEADERS,
  checkinsTabTitle,
} from '../sheets/constants.js';
import { SheetsError } from '../sheets/errors.js';
import { checkinDisplayName } from './displayName.js';
import { MemberNotFoundError } from './errors.js';

function headersMatch(row, expected) {
  if (!row || row.length < expected.length) {
    return false;
  }
  return expected.every((h, i) => row[i] === h);
}

export function createCheckinRepository(
  adapter,
  membersRepository,
  leaderboardRepository = null,
) {
  async function ensureCheckinsSheetReady(year) {
    const title = checkinsTabTitle(year);
    const meta = await adapter.getCheckinsTabMeta(year);
    if (!meta.exists) {
      await adapter.createCheckinsTab(year, CHECKINS_HEADERS);
      return title;
    }
    if (!headersMatch(meta.headers, CHECKINS_HEADERS)) {
      throw new SheetsError(
        'sheet_setup_invalid',
        503,
        'Check-ins tab headers do not match expected schema',
      );
    }
    return title;
  }

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

  function countForMember(rows, memberId) {
    return rows.filter((row) => row.memberId === memberId).length;
  }

  function hasCheckinToday(rows, memberId, date) {
    return rows.some((row) => row.memberId === memberId && row.date === date);
  }

  async function requireMember(memberId) {
    const member = await membersRepository.findMemberById(memberId);
    if (!member) {
      throw new MemberNotFoundError();
    }
    return member;
  }

  async function getStatus(memberId, now = new Date()) {
    const member = await requireMember(memberId);
    const year = calendarYear(now);
    const today = calendarDateString(now);
    const rows = await listYearCheckins(year);
    const rank = leaderboardRepository
      ? await leaderboardRepository.getRankForMember(memberId, now)
      : undefined;
    return {
      checkedInToday: hasCheckinToday(rows, memberId, today),
      yearCount: countForMember(rows, memberId),
      rank,
      firstName: member.firstName,
      lastName: member.lastName,
      optOutRanking: member.optOutRanking,
    };
  }

  async function checkIn({ memberId, firstName, lastName }, now = new Date()) {
    await requireMember(memberId);
    const year = calendarYear(now);
    const date = calendarDateString(now);
    const displayName = checkinDisplayName({ firstName, lastName });

    await ensureCheckinsSheetReady(year);
    const rows = await adapter.listCheckinRows(year);

    if (hasCheckinToday(rows, memberId, date)) {
      return {
        status: 'already_checked_in',
        date,
        yearCount: countForMember(rows, memberId),
      };
    }

    await adapter.appendCheckinRow(year, {
      memberId,
      date,
      displayName,
    });

    const yearCount = countForMember(rows, memberId) + 1;
    return {
      status: 'checked_in',
      date,
      yearCount,
    };
  }

  return { checkIn, getStatus };
}
