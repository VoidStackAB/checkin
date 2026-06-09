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

export function isValidDateString(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseBackfillBody(body) {
  const names = parseMemberNames(body);
  if (names.error) {
    return names;
  }
  const memberId =
    typeof body?.memberId === 'string' ? body.memberId.trim() : '';
  if (!memberId) {
    return { error: 'invalid_format' };
  }
  const date = typeof body?.date === 'string' ? body.date.trim() : '';
  if (!isValidDateString(date)) {
    return { error: 'invalid_date' };
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
    date,
    ...(groupId !== undefined ? { groupId } : {}),
  };
}

export function parseHistoryQuery(query) {
  const memberId =
    typeof query?.memberId === 'string' ? query.memberId.trim() : '';
  if (!memberId) {
    return { error: 'invalid_format' };
  }
  let year;
  if (query && query.year !== undefined && query.year !== '') {
    const parsedYear = Number(query.year);
    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 3000) {
      return { error: 'invalid_format' };
    }
    year = parsedYear;
  }
  return { memberId, ...(year !== undefined ? { year } : {}) };
}
