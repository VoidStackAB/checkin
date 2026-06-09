import { calendarDateString, calendarYear } from '../time/clubCalendar.js';
import {
  CHECKINS_HEADERS,
  DEFAULT_GROUP_ID,
  groupCheckinsTabTitle,
} from '../sheets/constants.js';
import { SheetsError } from '../sheets/errors.js';
import { checkinDisplayName } from './displayName.js';
import { InvalidCheckinDateError, MemberNotFoundError } from './errors.js';
import { NotInGroupError } from '../groups/errors.js';

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
  groupsRepository = null,
) {
  async function ensureCheckinTabReady(title) {
    const meta = await adapter.getCheckinTabMeta(title);
    if (!meta.exists) {
      await adapter.createCheckinTab(title, CHECKINS_HEADERS);
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

  async function listCheckinsByTitle(title) {
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
    const title = groupCheckinsTabTitle(DEFAULT_GROUP_ID, year);
    const rows = await listCheckinsByTitle(title);
    const rank = leaderboardRepository
      ? await leaderboardRepository.getRankForMember(
          memberId,
          now,
          DEFAULT_GROUP_ID,
        )
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

  async function checkIn(
    { memberId, firstName, lastName, groupId = DEFAULT_GROUP_ID },
    now = new Date(),
  ) {
    await requireMember(memberId);
    if (groupsRepository) {
      const allowed = await groupsRepository.isMemberInGroup(memberId, groupId);
      if (!allowed) {
        throw new NotInGroupError();
      }
    }
    const year = calendarYear(now);
    const date = calendarDateString(now);
    const displayName = checkinDisplayName({ firstName, lastName });
    const title = groupCheckinsTabTitle(groupId, year);

    await ensureCheckinTabReady(title);
    const rows = await adapter.listCheckinRowsByTitle(title);

    if (hasCheckinToday(rows, memberId, date)) {
      return {
        status: 'already_checked_in',
        date,
        groupId,
        yearCount: countForMember(rows, memberId),
      };
    }

    await adapter.appendCheckinRowByTitle(title, {
      memberId,
      date,
      displayName,
    });

    const yearCount = countForMember(rows, memberId) + 1;
    return {
      status: 'checked_in',
      date,
      groupId,
      yearCount,
    };
  }

  async function getGroupCheckinSummaries(memberId, groups, now = new Date()) {
    await requireMember(memberId);
    const year = calendarYear(now);
    const today = calendarDateString(now);
    const summaries = [];
    for (const group of groups) {
      const title = groupCheckinsTabTitle(group.groupId, year);
      // eslint-disable-next-line no-await-in-loop
      const rows = await listCheckinsByTitle(title);
      summaries.push({
        groupId: group.groupId,
        name: group.name,
        isDefault: Boolean(group.isDefault),
        checkedInToday: hasCheckinToday(rows, memberId, today),
        yearCount: countForMember(rows, memberId),
      });
    }
    return summaries;
  }

  async function addCheckinForDate(
    { memberId, firstName, lastName, groupId = DEFAULT_GROUP_ID, date },
    now = new Date(),
  ) {
    await requireMember(memberId);
    if (groupsRepository) {
      const allowed = await groupsRepository.isMemberInGroup(memberId, groupId);
      if (!allowed) {
        throw new NotInGroupError();
      }
    }
    const today = calendarDateString(now);
    // Lexicographic comparison is chronological for YYYY-MM-DD strings.
    if (!date || date > today) {
      throw new InvalidCheckinDateError();
    }
    const year = Number(date.slice(0, 4));
    const displayName = checkinDisplayName({ firstName, lastName });
    const title = groupCheckinsTabTitle(groupId, year);

    await ensureCheckinTabReady(title);
    const rows = await adapter.listCheckinRowsByTitle(title);

    if (hasCheckinToday(rows, memberId, date)) {
      return {
        status: 'already_checked_in',
        date,
        groupId,
        yearCount: countForMember(rows, memberId),
      };
    }

    await adapter.appendCheckinRowByTitle(title, {
      memberId,
      date,
      displayName,
    });

    return {
      status: 'checked_in',
      date,
      groupId,
      yearCount: countForMember(rows, memberId) + 1,
    };
  }

  async function getMemberHistory(
    memberId,
    groups,
    { year } = {},
    now = new Date(),
  ) {
    await requireMember(memberId);
    const targetYear = year ?? calendarYear(now);
    const counts = {};
    const entries = [];
    for (const group of groups) {
      const title = groupCheckinsTabTitle(group.groupId, targetYear);
      // eslint-disable-next-line no-await-in-loop
      const rows = await listCheckinsByTitle(title);
      for (const row of rows) {
        if (row.memberId === memberId && row.date) {
          counts[row.date] = (counts[row.date] ?? 0) + 1;
          entries.push({
            date: row.date,
            groupId: group.groupId,
            groupName: group.name,
          });
        }
      }
    }
    // Most recent first; tie-break on group name for stable ordering.
    entries.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date < b.date ? 1 : -1;
      }
      return a.groupName.localeCompare(b.groupName);
    });
    let checkinCount = 0;
    for (const value of Object.values(counts)) {
      checkinCount += value;
    }
    return {
      year: targetYear,
      counts,
      entries,
      dayCount: Object.keys(counts).length,
      checkinCount,
    };
  }

  return {
    checkIn,
    getStatus,
    getGroupCheckinSummaries,
    addCheckinForDate,
    getMemberHistory,
  };
}
