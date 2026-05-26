/**
 * @typedef {object} MemberRow
 * @property {string} memberId
 * @property {string} firstName
 * @property {string} lastName
 * @property {boolean} optOutRanking
 * @property {string} createdAt
 */

/**
 * @typedef {object} RankedMember
 * @property {string} memberId
 * @property {string} firstName
 * @property {string} lastName
 * @property {boolean} optOutRanking
 * @property {string} createdAt
 * @property {number} yearCount
 * @property {number} rank
 */

/**
 * @param {MemberRow[]} members
 * @param {{ memberId: string }[]} checkinRows
 */
export function countCheckinsForMembers(members, checkinRows) {
  const validIds = new Set(members.map((m) => m.memberId));
  const counts = new Map(members.map((m) => [m.memberId, 0]));

  for (const row of checkinRows) {
    if (validIds.has(row.memberId)) {
      counts.set(row.memberId, counts.get(row.memberId) + 1);
    }
  }

  return counts;
}

/**
 * @param {MemberRow[]} members
 * @param {Map<string, number>} counts
 * @returns {RankedMember[]}
 */
export function buildRankedMembers(members, counts) {
  const sorted = [...members].sort((a, b) => {
    const countA = counts.get(a.memberId) ?? 0;
    const countB = counts.get(b.memberId) ?? 0;
    if (countB !== countA) {
      return countB - countA;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });

  /** @type {RankedMember[]} */
  const ranked = [];
  let rank = 1;
  let index = 0;

  while (index < sorted.length) {
    const count = counts.get(sorted[index].memberId) ?? 0;
    let end = index;
    while (end < sorted.length) {
      const nextCount = counts.get(sorted[end].memberId) ?? 0;
      if (nextCount !== count) {
        break;
      }
      end += 1;
    }

    for (let i = index; i < end; i += 1) {
      const member = sorted[i];
      ranked.push({
        memberId: member.memberId,
        firstName: member.firstName,
        lastName: member.lastName,
        optOutRanking: member.optOutRanking,
        createdAt: member.createdAt,
        yearCount: count,
        rank,
      });
    }

    rank += end - index;
    index = end;
  }

  return ranked;
}

/**
 * Dense display rank: ties share a place; the next count is always +1 (1, 1, 2, 3…).
 * @param {{ firstName: string, lastName: string, yearCount: number }[]} rows
 */
function assignDisplayRanks(rows) {
  /** @type {{ rank: number, firstName: string, lastName: string, yearCount: number }[]} */
  const entries = [];
  let rank = 1;
  let index = 0;

  while (index < rows.length) {
    const count = rows[index].yearCount;
    let end = index;
    while (end < rows.length && rows[end].yearCount === count) {
      end += 1;
    }
    for (let i = index; i < end; i += 1) {
      entries.push({
        rank,
        firstName: rows[i].firstName,
        lastName: rows[i].lastName,
        yearCount: rows[i].yearCount,
      });
    }
    rank += 1;
    index = end;
  }

  return entries;
}

/**
 * @param {RankedMember[]} ranked
 */
export function getPublicLeaderboardEntries(ranked) {
  const visible = ranked.filter(
    (row) => !row.optOutRanking && row.yearCount >= 1 && row.rank <= 10,
  );
  return assignDisplayRanks(visible);
}

/**
 * @param {RankedMember[]} ranked
 * @param {string} memberId
 */
export function getPersonalYearRank(ranked, memberId) {
  const row = ranked.find((m) => m.memberId === memberId);
  return row?.rank ?? null;
}
