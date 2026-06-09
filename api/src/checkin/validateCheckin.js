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
  const hasGroupId = body && Object.hasOwn(body, 'groupId');
  let groupId;
  if (hasGroupId) {
    if (typeof body.groupId !== 'string' || body.groupId.trim() === '') {
      return { error: 'invalid_format' };
    }
    groupId = body.groupId.trim();
  }
  return {
    memberId,
    firstName: names.firstName,
    lastName: names.lastName,
    ...(groupId !== undefined ? { groupId } : {}),
  };
}

export function parseMemberIdQuery(query) {
  const memberId =
    typeof query?.memberId === 'string' ? query.memberId.trim() : '';
  if (!memberId) {
    return { error: 'invalid_format' };
  }
  return { memberId };
}
