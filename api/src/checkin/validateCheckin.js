import { parseMemberNames } from '../members/validateNames.js';

export function parseCheckinBody(body) {
  const names = parseMemberNames(body);
  if (names.error) {
    return names;
  }
  const memberId =
    typeof body?.memberId === 'string' ? body.memberId.trim() : '';
  if (!memberId) {
    return { error: 'invalid_format' };
  }
  return { memberId, firstName: names.firstName, lastName: names.lastName };
}

export function parseMemberIdQuery(query) {
  const memberId =
    typeof query?.memberId === 'string' ? query.memberId.trim() : '';
  if (!memberId) {
    return { error: 'invalid_format' };
  }
  return { memberId };
}
