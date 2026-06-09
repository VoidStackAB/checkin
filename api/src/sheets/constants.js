export const MEMBERS_TAB = 'members';

export const MEMBERS_HEADERS = [
  'memberId',
  'firstName',
  'lastName',
  'optOutRanking',
  'createdAt',
];

export const CHECKINS_HEADERS = ['memberId', 'date', 'displayName'];

export const GROUPS_TAB = 'groups';

export const GROUPS_HEADERS = ['groupId', 'name', 'createdAt'];

export const MEMBER_GROUPS_TAB = 'member_groups';

export const MEMBER_GROUPS_HEADERS = ['memberId', 'groupIds'];

export const DEFAULT_GROUP_ID = 'default';

export function checkinsTabTitle(year) {
  return `checkins_${year}`;
}

export function groupCheckinsTabTitle(groupId, year) {
  if (groupId === DEFAULT_GROUP_ID) {
    return checkinsTabTitle(year);
  }
  return `group${groupId}_${year}`;
}
