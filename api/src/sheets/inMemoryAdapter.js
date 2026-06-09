import {
  MEMBERS_TAB,
  GROUPS_TAB,
  MEMBER_GROUPS_TAB,
  checkinsTabTitle,
} from './constants.js';

export function createInMemorySheetsAdapter() {
  let membersTab = null;
  let groupsTab = null;
  let memberGroupsTab = null;
  const checkinTabs = new Map();

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

    async updateMemberRow(row) {
      if (!membersTab) {
        throw new Error('Members tab not initialized');
      }
      const index = membersTab.rows.findIndex((r) => r.memberId === row.memberId);
      if (index === -1) {
        throw new Error('Member not found');
      }
      membersTab.rows[index] = { ...row };
    },

    async getGroupsTabMeta() {
      if (!groupsTab) {
        return { exists: false, headers: null };
      }
      return { exists: true, headers: [...groupsTab.headers] };
    },

    async createGroupsTab(headers) {
      groupsTab = { headers: [...headers], rows: [] };
    },

    async listGroupRows() {
      return groupsTab?.rows.map((row) => ({ ...row })) ?? [];
    },

    async getMemberGroupsTabMeta() {
      if (!memberGroupsTab) {
        return { exists: false, headers: null };
      }
      return { exists: true, headers: [...memberGroupsTab.headers] };
    },

    async createMemberGroupsTab(headers) {
      memberGroupsTab = { headers: [...headers], rows: [] };
    },

    async listMemberGroupRows() {
      return memberGroupsTab?.rows.map((row) => ({ ...row })) ?? [];
    },

    async appendMemberGroupRow(row) {
      if (!memberGroupsTab) {
        throw new Error('member_groups tab not initialized');
      }
      memberGroupsTab.rows.push({ ...row });
    },

    async updateMemberGroupRow(row) {
      if (!memberGroupsTab) {
        throw new Error('member_groups tab not initialized');
      }
      const index = memberGroupsTab.rows.findIndex(
        (r) => r.memberId === row.memberId,
      );
      if (index === -1) {
        throw new Error('Member group row not found');
      }
      memberGroupsTab.rows[index] = { ...row };
    },

    async getCheckinTabMeta(title) {
      const tab = checkinTabs.get(title);
      if (!tab) {
        return { exists: false, headers: null };
      }
      return { exists: true, headers: [...tab.headers] };
    },

    async createCheckinTab(title, headers) {
      checkinTabs.set(title, { headers: [...headers], rows: [] });
    },

    async listCheckinRowsByTitle(title) {
      const rows = checkinTabs.get(title)?.rows;
      return rows ? rows.map((row) => ({ ...row })) : [];
    },

    async appendCheckinRowByTitle(title, row) {
      const tab = checkinTabs.get(title);
      if (!tab) {
        throw new Error('Check-ins tab not initialized');
      }
      tab.rows.push({ ...row });
    },

    async getCheckinsTabMeta(year) {
      return this.getCheckinTabMeta(checkinsTabTitle(year));
    },

    async createCheckinsTab(year, headers) {
      return this.createCheckinTab(checkinsTabTitle(year), headers);
    },

    async listCheckinRows(year) {
      return this.listCheckinRowsByTitle(checkinsTabTitle(year));
    },

    async appendCheckinRow(year, row) {
      return this.appendCheckinRowByTitle(checkinsTabTitle(year), row);
    },

    /** @internal test helper */
    _snapshot() {
      return membersTab ? { title: MEMBERS_TAB, ...membersTab } : null;
    },

    /** @internal test helper */
    _groupsSnapshot() {
      return groupsTab ? { title: GROUPS_TAB, ...groupsTab } : null;
    },

    /** @internal test helper */
    _memberGroupsSnapshot() {
      return memberGroupsTab
        ? { title: MEMBER_GROUPS_TAB, ...memberGroupsTab }
        : null;
    },

    /** @internal test helper */
    _checkinsSnapshot(year) {
      return this._checkinTabSnapshot(checkinsTabTitle(year));
    },

    /** @internal test helper */
    _checkinTabSnapshot(title) {
      const tab = checkinTabs.get(title);
      return tab ? { title, ...tab } : null;
    },

    /** @internal test helper: seed a coach-managed group */
    _seedGroup(group) {
      if (!groupsTab) {
        groupsTab = { headers: ['groupId', 'name', 'createdAt'], rows: [] };
      }
      groupsTab.rows.push({
        groupId: String(group.groupId),
        name: group.name ?? '',
        createdAt: group.createdAt ?? '',
      });
    },
  };
}
