import {
  GROUPS_HEADERS,
  MEMBER_GROUPS_HEADERS,
  DEFAULT_GROUP_ID,
} from '../sheets/constants.js';
import { SheetsError } from '../sheets/errors.js';
import { MemberNotFoundError } from '../checkin/errors.js';
import { GroupNotFoundError } from './errors.js';

// Stored in the member_groups `groupIds` cell to mark that a member has
// explicitly left the default group. Members with no row (legacy) stay in the
// default group, so leaving is opt-out rather than requiring a row per member.
const NO_DEFAULT_TOKEN = 'no-default';

function headersMatch(row, expected) {
  if (!row || row.length < expected.length) {
    return false;
  }
  return expected.every((h, i) => row[i] === h);
}

function groupLabel(groupId) {
  return `Group${groupId}`;
}

function sortByGroupId(a, b) {
  const na = Number(a.groupId);
  const nb = Number(b.groupId);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    return na - nb;
  }
  return String(a.groupId).localeCompare(String(b.groupId));
}

function parseTokens(csv) {
  return (csv ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '');
}

function membershipFromTokens(tokens) {
  return {
    inDefault: !tokens.includes(NO_DEFAULT_TOKEN),
    extraIds: tokens.filter((token) => token !== NO_DEFAULT_TOKEN),
  };
}

function serializeMembership({ inDefault, extraIds }) {
  const tokens = [...extraIds];
  if (!inDefault) {
    tokens.push(NO_DEFAULT_TOKEN);
  }
  return tokens.join(',');
}

export function createGroupsRepository(
  adapter,
  membersRepository,
  { defaultGroupName = 'Standard' } = {},
) {
  function defaultGroup() {
    return { groupId: DEFAULT_GROUP_ID, name: defaultGroupName, isDefault: true };
  }

  async function ensureGroupsSheetReady() {
    const meta = await adapter.getGroupsTabMeta();
    if (!meta.exists) {
      await adapter.createGroupsTab(GROUPS_HEADERS);
      return;
    }
    if (!headersMatch(meta.headers, GROUPS_HEADERS)) {
      throw new SheetsError(
        'sheet_setup_invalid',
        503,
        'Groups tab headers do not match expected schema',
      );
    }
  }

  async function ensureMemberGroupsSheetReady() {
    const meta = await adapter.getMemberGroupsTabMeta();
    if (!meta.exists) {
      await adapter.createMemberGroupsTab(MEMBER_GROUPS_HEADERS);
      return;
    }
    if (!headersMatch(meta.headers, MEMBER_GROUPS_HEADERS)) {
      throw new SheetsError(
        'sheet_setup_invalid',
        503,
        'member_groups tab headers do not match expected schema',
      );
    }
  }

  async function listAvailableGroups() {
    await ensureGroupsSheetReady();
    const rows = await adapter.listGroupRows();
    const seen = new Set();
    const groups = [];
    for (const row of rows) {
      const groupId = String(row.groupId ?? '').trim();
      if (!groupId || groupId === DEFAULT_GROUP_ID || seen.has(groupId)) {
        continue;
      }
      seen.add(groupId);
      groups.push({
        groupId,
        name: (row.name ?? '').trim() || groupLabel(groupId),
        isDefault: false,
      });
    }
    return groups.sort(sortByGroupId);
  }

  async function listAllGroups() {
    const extra = await listAvailableGroups();
    return [defaultGroup(), ...extra];
  }

  async function requireMember(memberId) {
    const member = await membersRepository.findMemberById(memberId);
    if (!member) {
      throw new MemberNotFoundError();
    }
    return member;
  }

  async function getMembershipState(memberId) {
    await ensureMemberGroupsSheetReady();
    const rows = await adapter.listMemberGroupRows();
    const row = rows.find((r) => r.memberId === memberId);
    return membershipFromTokens(parseTokens(row?.groupIds));
  }

  async function applyMembership(memberId, state) {
    const groupIds = serializeMembership(state);
    await ensureMemberGroupsSheetReady();
    const rows = await adapter.listMemberGroupRows();
    const existing = rows.find((r) => r.memberId === memberId);
    if (existing) {
      await adapter.updateMemberGroupRow({ memberId, groupIds });
    } else if (groupIds !== '') {
      await adapter.appendMemberGroupRow({ memberId, groupIds });
    }
  }

  async function getMemberGroups(memberId) {
    await requireMember(memberId);
    const extra = await listAvailableGroups();
    const { inDefault, extraIds } = await getMembershipState(memberId);
    const groups = [
      { ...defaultGroup(), isMember: inDefault },
      ...extra.map((group) => ({
        ...group,
        isMember: extraIds.includes(group.groupId),
      })),
    ];
    return { groups };
  }

  async function getMemberCheckinGroups(memberId) {
    const { groups } = await getMemberGroups(memberId);
    return groups.filter((group) => group.isMember);
  }

  async function isMemberInGroup(memberId, groupId) {
    const { inDefault, extraIds } = await getMembershipState(memberId);
    if (groupId === DEFAULT_GROUP_ID) {
      return inDefault;
    }
    const available = await listAvailableGroups();
    if (!available.some((group) => group.groupId === groupId)) {
      return false;
    }
    return extraIds.includes(groupId);
  }

  async function joinGroup(memberId, groupId) {
    await requireMember(memberId);
    const state = await getMembershipState(memberId);
    if (groupId === DEFAULT_GROUP_ID) {
      if (!state.inDefault) {
        await applyMembership(memberId, { ...state, inDefault: true });
      }
    } else {
      const available = await listAvailableGroups();
      if (!available.some((group) => group.groupId === groupId)) {
        throw new GroupNotFoundError();
      }
      if (!state.extraIds.includes(groupId)) {
        await applyMembership(memberId, {
          inDefault: state.inDefault,
          extraIds: [...state.extraIds, groupId],
        });
      }
    }
    return getMemberGroups(memberId);
  }

  async function leaveGroup(memberId, groupId) {
    await requireMember(memberId);
    const state = await getMembershipState(memberId);
    if (groupId === DEFAULT_GROUP_ID) {
      if (state.inDefault) {
        await applyMembership(memberId, { ...state, inDefault: false });
      }
    } else if (state.extraIds.includes(groupId)) {
      await applyMembership(memberId, {
        inDefault: state.inDefault,
        extraIds: state.extraIds.filter((id) => id !== groupId),
      });
    }
    return getMemberGroups(memberId);
  }

  return {
    defaultGroup,
    listAvailableGroups,
    listAllGroups,
    getMembershipState,
    getMemberGroups,
    getMemberCheckinGroups,
    isMemberInGroup,
    joinGroup,
    leaveGroup,
  };
}
