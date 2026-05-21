import { randomUUID } from 'node:crypto';
import { MEMBERS_HEADERS, CHECKINS_HEADERS } from '../sheets/constants.js';
import { SheetsError } from '../sheets/errors.js';
import { formatTimestamp, calendarYear } from '../time/clubCalendar.js';
import { rankMatchCandidates, toMatchCandidate } from './fuzzyMatch.js';
import { MemberNotFoundError } from '../checkin/errors.js';

function headersMatch(row, expected) {
  const headers = expected ?? MEMBERS_HEADERS;
  if (!row || row.length < headers.length) {
    return false;
  }
  return headers.every((h, i) => row[i] === h);
}

export function createMembersRepository(adapter) {
  async function ensureMembersSheetReady() {
    const meta = await adapter.getMembersTabMeta();
    if (!meta.exists) {
      await adapter.createMembersTab(MEMBERS_HEADERS);
      return;
    }
    if (!headersMatch(meta.headers, MEMBERS_HEADERS)) {
      throw new SheetsError(
        'sheet_setup_invalid',
        503,
        'Members tab headers do not match expected schema',
      );
    }
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

  async function listMembers() {
    await ensureMembersSheetReady();
    return adapter.listMemberRows();
  }

  async function matchMembers({ firstName, lastName }, now = new Date()) {
    const members = await listMembers();
    const year = calendarYear(now);
    const checkinRows = await listYearCheckins(year);
    const ranked = rankMatchCandidates(firstName, lastName, members);

    const candidates = ranked.map(({ member }) =>
      toMatchCandidate(member, countForMember(checkinRows, member.memberId)),
    );

    return { candidates };
  }

  async function createMember({ firstName, lastName }) {
    await ensureMembersSheetReady();
    const memberId = randomUUID();
    const createdAt = formatTimestamp();
    await adapter.appendMemberRow({
      memberId,
      firstName,
      lastName,
      optOutRanking: false,
      createdAt,
    });
    return { memberId, firstName, lastName };
  }

  async function linkMember(memberId) {
    const member = await findMemberById(memberId);
    if (!member) {
      throw new MemberNotFoundError();
    }
    return {
      memberId: member.memberId,
      firstName: member.firstName,
      lastName: member.lastName,
    };
  }

  async function findMemberById(memberId) {
    const rows = await listMembers();
    return rows.find((row) => row.memberId === memberId) ?? null;
  }

  return { matchMembers, createMember, linkMember, listMembers, findMemberById };
}
