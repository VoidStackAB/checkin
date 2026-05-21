import { randomUUID } from 'node:crypto';
import { MEMBERS_HEADERS } from '../sheets/constants.js';
import { SheetsError } from '../sheets/errors.js';
import { formatTimestamp } from '../time/clubCalendar.js';

function headersMatch(row) {
  if (!row || row.length < MEMBERS_HEADERS.length) {
    return false;
  }
  return MEMBERS_HEADERS.every((h, i) => row[i] === h);
}

export function createMembersRepository(adapter) {
  async function ensureMembersSheetReady() {
    const meta = await adapter.getMembersTabMeta();
    if (!meta.exists) {
      await adapter.createMembersTab(MEMBERS_HEADERS);
      return;
    }
    if (!headersMatch(meta.headers)) {
      throw new SheetsError(
        'sheet_setup_invalid',
        503,
        'Members tab headers do not match expected schema',
      );
    }
  }

  async function listMembers() {
    await ensureMembersSheetReady();
    return adapter.listMemberRows();
  }

  async function matchMembers({ firstName, lastName }) {
    await listMembers();
    void firstName;
    void lastName;
    return { candidates: [] };
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

  async function findMemberById(memberId) {
    const rows = await listMembers();
    return rows.find((row) => row.memberId === memberId) ?? null;
  }

  return { matchMembers, createMember, listMembers, findMemberById };
}
