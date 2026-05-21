import { parseMemberNames } from './validateNames.js';

export function parseCreateOrLinkBody(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'invalid_format' };
  }

  const memberId =
    typeof body.memberId === 'string' ? body.memberId.trim() : '';

  if (memberId) {
    return { link: true, memberId };
  }

  const names = parseMemberNames(body);
  if (names.error) {
    return names;
  }
  return { link: false, ...names };
}
