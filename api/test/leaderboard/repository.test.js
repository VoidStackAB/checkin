import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMembersRepository } from '../../src/members/repository.js';
import { createLeaderboardRepository } from '../../src/leaderboard/repository.js';
import { createInMemorySheetsAdapter } from '../../src/sheets/inMemoryAdapter.js';
import { CHECKINS_HEADERS } from '../../src/sheets/constants.js';

describe('leaderboard repository', () => {
  it('resets counts and ranks at year boundary', async () => {
    const adapter = createInMemorySheetsAdapter();
    const members = createMembersRepository(adapter);
    const leaderboard = createLeaderboardRepository(adapter, members);
    const created = await members.createMember({
      firstName: 'Anna',
      lastName: 'Test',
    });

    await adapter.createCheckinsTab(2026, CHECKINS_HEADERS);
    await adapter.appendCheckinRow(2026, {
      memberId: created.memberId,
      date: '2026-12-31',
      displayName: 'Anna Test',
    });

    const dec = await leaderboard.getPublicLeaderboard(
      new Date('2026-12-31T12:00:00Z'),
    );
    assert.equal(dec.entries.length, 1);
    assert.equal(dec.entries[0].yearCount, 1);

    const jan = await leaderboard.buildRankings(
      new Date('2027-01-01T12:00:00Z'),
    );
    const anna = jan.find((r) => r.memberId === created.memberId);
    assert.equal(anna.yearCount, 0);
    assert.equal(anna.rank, 1);

    const emptyBoard = await leaderboard.getPublicLeaderboard(
      new Date('2027-01-01T12:00:00Z'),
    );
    assert.deepEqual(emptyBoard.entries, []);
  });

  it('opt-out member has rank but no public entry', async () => {
    const adapter = createInMemorySheetsAdapter();
    const members = createMembersRepository(adapter);
    const leaderboard = createLeaderboardRepository(adapter, members);
    const visible = await members.createMember({
      firstName: 'Anna',
      lastName: 'Open',
    });
    const hidden = await members.createMember({
      firstName: 'Erik',
      lastName: 'Hidden',
    });
    await members.updateMember({
      memberId: hidden.memberId,
      optOutRanking: true,
    });

    await adapter.createCheckinsTab(2026, CHECKINS_HEADERS);
    for (const id of [visible.memberId, hidden.memberId]) {
      await adapter.appendCheckinRow(2026, {
        memberId: id,
        date: '2026-05-01',
        displayName: 'X',
      });
    }

    const now = new Date('2026-05-21T12:00:00Z');
    const board = await leaderboard.getPublicLeaderboard(now);
    assert.equal(board.entries.length, 1);
    assert.equal(board.entries[0].firstName, 'Anna');

    const ranked = await leaderboard.buildRankings(now);
    assert.equal(
      ranked.find((r) => r.memberId === hidden.memberId).rank,
      1,
    );
  });
});
