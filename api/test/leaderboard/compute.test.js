import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRankedMembers,
  countCheckinsForMembers,
  getPersonalYearRank,
  getPublicLeaderboardEntries,
} from '../../src/leaderboard/compute.js';

function member(id, opts = {}) {
  return {
    memberId: id,
    firstName: opts.firstName ?? 'Test',
    lastName: opts.lastName ?? 'User',
    optOutRanking: opts.optOutRanking ?? false,
    createdAt: opts.createdAt ?? '2026-01-01T10:00:00',
  };
}

describe('leaderboard compute', () => {
  it('assigns shared ranks with skip after ties', () => {
    const members = [
      member('a', { createdAt: '2026-01-01T10:00:00' }),
      member('b', { createdAt: '2026-01-02T10:00:00' }),
      member('c', { createdAt: '2026-01-03T10:00:00' }),
    ];
    const counts = new Map([
      ['a', 5],
      ['b', 3],
      ['c', 3],
    ]);
    const ranked = buildRankedMembers(members, counts);
    assert.equal(ranked[0].memberId, 'a');
    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[1].rank, 2);
    assert.equal(ranked[2].rank, 2);
    assert.deepEqual(
      ranked.map((r) => r.rank),
      [1, 2, 2],
    );
  });

  it('excludes opt-out and zero-count from public entries', () => {
    const members = [
      member('a', { firstName: 'Anna', lastName: 'A' }),
      member('b', {
        firstName: 'Erik',
        lastName: 'B',
        optOutRanking: true,
      }),
      member('c', { firstName: 'Carl', lastName: 'C' }),
    ];
    const counts = new Map([
      ['a', 2],
      ['b', 10],
      ['c', 0],
    ]);
    const ranked = buildRankedMembers(members, counts);
    const entries = getPublicLeaderboardEntries(ranked);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].firstName, 'Anna');
    assert.equal(entries[0].rank, 2);
    assert.equal(getPersonalYearRank(ranked, 'b'), 1);
    assert.equal(getPersonalYearRank(ranked, 'c'), 3);
  });

  it('includes full tie group at rank 10', () => {
    const members = [];
    const counts = new Map();
    for (let i = 0; i < 9; i += 1) {
      const id = `top${i}`;
      members.push(
        member(id, {
          createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00`,
        }),
      );
      counts.set(id, 100 - i * 10);
    }
    for (let i = 0; i < 4; i += 1) {
      const id = `tie${i}`;
      members.push(
        member(id, {
          createdAt: `2026-02-${String(i + 1).padStart(2, '0')}T10:00:00`,
        }),
      );
      counts.set(id, 5);
    }
    const entries = getPublicLeaderboardEntries(
      buildRankedMembers(members, counts),
    );
    assert.equal(entries.filter((e) => e.rank === 10).length, 4);
    assert.equal(entries.length, 13);
  });

  it('ignores orphan check-in rows', () => {
    const members = [member('a')];
    const rows = [
      { memberId: 'a' },
      { memberId: 'a' },
      { memberId: 'orphan' },
    ];
    const counts = countCheckinsForMembers(members, rows);
    assert.equal(counts.get('a'), 2);
  });

  it('sorts ties by createdAt ascending', () => {
    const members = [
      member('late', { createdAt: '2026-02-01T10:00:00' }),
      member('early', { createdAt: '2026-01-01T10:00:00' }),
    ];
    const counts = new Map([
      ['late', 1],
      ['early', 1],
    ]);
    const ranked = buildRankedMembers(members, counts);
    assert.equal(ranked[0].memberId, 'early');
    assert.equal(ranked[1].memberId, 'late');
  });
});
