import { checkinDisplayName } from '../checkin/displayName.js';

const THRESHOLD = 0.85;
const MAX_CANDIDATES = 3;

export function normalizeFullName(firstName, lastName) {
  const full = `${firstName} ${lastName}`.trim().toLowerCase().replace(/\s+/g, ' ');
  return full.replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o');
}

export function levenshteinDistance(a, b) {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

export function levenshteinRatio(a, b) {
  if (a.length === 0 && b.length === 0) {
    return 1;
  }
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) {
    return 1;
  }
  return 1 - levenshteinDistance(a, b) / maxLen;
}

function compareCreatedAt(a, b) {
  const left = a ?? '';
  const right = b ?? '';
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export function rankMatchCandidates(
  firstName,
  lastName,
  members,
  { threshold = THRESHOLD, maxResults = MAX_CANDIDATES } = {},
) {
  const queryNorm = normalizeFullName(firstName, lastName);

  const scored = members
    .map((member) => ({
      member,
      score: levenshteinRatio(
        queryNorm,
        normalizeFullName(member.firstName, member.lastName),
      ),
    }))
    .filter(({ score }) => score >= threshold);

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return compareCreatedAt(a.member.createdAt, b.member.createdAt);
  });

  return scored.slice(0, maxResults);
}

export function toMatchCandidate(member, yearCount) {
  return {
    memberId: member.memberId,
    firstName: member.firstName,
    lastName: member.lastName,
    displayName: checkinDisplayName({
      firstName: member.firstName,
      lastName: member.lastName,
    }),
    yearCount,
  };
}

export { THRESHOLD, MAX_CANDIDATES };
