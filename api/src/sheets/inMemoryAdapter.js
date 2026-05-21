import { MEMBERS_TAB, MEMBERS_HEADERS } from './constants.js';

export function createInMemorySheetsAdapter() {
  let tab = null;

  return {
    async getMembersTabMeta() {
      if (!tab) {
        return { exists: false, headers: null };
      }
      return { exists: true, headers: [...tab.headers] };
    },

    async createMembersTab(headers) {
      tab = { headers: [...headers], rows: [] };
    },

    async listMemberRows() {
      return tab?.rows ?? [];
    },

    async appendMemberRow(row) {
      if (!tab) {
        throw new Error('Members tab not initialized');
      }
      tab.rows.push({ ...row });
    },

    /** @internal test helper */
    _snapshot() {
      return tab ? { title: MEMBERS_TAB, ...tab } : null;
    },
  };
}
