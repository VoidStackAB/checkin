import { MEMBERS_TAB, MEMBERS_HEADERS, checkinsTabTitle } from './constants.js';

export function createInMemorySheetsAdapter() {
  let membersTab = null;
  const checkinsTabs = new Map();

  return {
    async getMembersTabMeta() {
      if (!membersTab) {
        return { exists: false, headers: null };
      }
      return { exists: true, headers: [...membersTab.headers] };
    },

    async createMembersTab(headers) {
      membersTab = { headers: [...headers], rows: [] };
    },

    async listMemberRows() {
      return membersTab?.rows.map((row) => ({ ...row })) ?? [];
    },

    async appendMemberRow(row) {
      if (!membersTab) {
        throw new Error('Members tab not initialized');
      }
      membersTab.rows.push({ ...row });
    },

    async getCheckinsTabMeta(year) {
      const tab = checkinsTabs.get(year);
      if (!tab) {
        return { exists: false, headers: null };
      }
      return { exists: true, headers: [...tab.headers] };
    },

    async createCheckinsTab(year, headers) {
      checkinsTabs.set(year, { headers: [...headers], rows: [] });
    },

    async listCheckinRows(year) {
      const rows = checkinsTabs.get(year)?.rows;
      return rows ? rows.map((row) => ({ ...row })) : [];
    },

    async appendCheckinRow(year, row) {
      const tab = checkinsTabs.get(year);
      if (!tab) {
        throw new Error('Check-ins tab not initialized');
      }
      tab.rows.push({ ...row });
    },

    /** @internal test helper */
    _snapshot() {
      return membersTab ? { title: MEMBERS_TAB, ...membersTab } : null;
    },

    /** @internal test helper */
    _checkinsSnapshot(year) {
      const tab = checkinsTabs.get(year);
      return tab ? { title: checkinsTabTitle(year), ...tab } : null;
    },
  };
}
