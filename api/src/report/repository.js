import {
  CHECKINS_HEADERS,
  groupCheckinsTabTitle,
} from '../sheets/constants.js';
import { SheetsError } from '../sheets/errors.js';

function headersMatch(row, expected) {
  if (!row || row.length < expected.length) {
    return false;
  }
  return expected.every((h, i) => row[i] === h);
}

export function createReportRepository(adapter, membersRepository) {
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

  // Who checked in on a given calendar day, in a given group. The group is
  // implied by which yearly tab the rows live in, so the year is derived from
  // the requested date.
  async function getCheckinsForDate({ groupId, date }) {
    const year = Number(date.slice(0, 4));
    const title = groupCheckinsTabTitle(groupId, year);
    const rows = await listCheckinsByTitle(title);
    const members = await membersRepository.listMembers();
    const membersById = new Map(members.map((m) => [m.memberId, m]));

    const checkins = rows
      .filter((row) => row.date === date)
      .map((row) => {
        const member = membersById.get(row.memberId);
        const firstName = member?.firstName ?? '';
        const lastName = member?.lastName ?? '';
        // Prefer the current member name; fall back to the snapshot stored on
        // the check-in row (e.g. if the member was later removed).
        const name =
          (member ? `${firstName} ${lastName}`.trim() : '') ||
          row.displayName ||
          '';
        return { memberId: row.memberId, name, firstName, lastName };
      });

    checkins.sort((a, b) => a.name.localeCompare(b.name, 'sv'));

    return { date, groupId, count: checkins.length, checkins };
  }

  return { getCheckinsForDate };
}
