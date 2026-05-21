export const MEMBERS_TAB = 'members';

export const MEMBERS_HEADERS = [
  'memberId',
  'firstName',
  'lastName',
  'optOutRanking',
  'createdAt',
];

export const CHECKINS_HEADERS = ['memberId', 'date', 'displayName'];

export function checkinsTabTitle(year) {
  return `checkins_${year}`;
}
