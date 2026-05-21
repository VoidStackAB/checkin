import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMembersRepository } from '../../src/members/repository.js';
import { createCheckinRepository } from '../../src/checkin/repository.js';
import { createInMemorySheetsAdapter } from '../../src/sheets/inMemoryAdapter.js';
import { MemberNotFoundError } from '../../src/checkin/errors.js';
import { CHECKINS_HEADERS } from '../../src/sheets/constants.js';

describe('checkin repository', () => {
  it('is idempotent for same member and day', async () => {
    const adapter = createInMemorySheetsAdapter();
    const members = createMembersRepository(adapter);
    const checkins = createCheckinRepository(adapter, members);
    const created = await members.createMember({
      firstName: 'Anna',
      lastName: 'Test',
    });
    const now = new Date('2026-05-21T12:00:00Z');
    const first = await checkins.checkIn(
      {
        memberId: created.memberId,
        firstName: 'Anna',
        lastName: 'Test',
      },
      now,
    );
    assert.equal(first.status, 'checked_in');
    assert.equal(first.yearCount, 1);

    const second = await checkins.checkIn(
      {
        memberId: created.memberId,
        firstName: 'Anna',
        lastName: 'Other',
      },
      now,
    );
    assert.equal(second.status, 'already_checked_in');
    assert.equal(second.yearCount, 1);

    const snap = adapter._checkinsSnapshot(2026);
    assert.deepEqual(snap.headers, CHECKINS_HEADERS);
    assert.equal(snap.rows.length, 1);
    assert.equal(snap.rows[0].displayName, 'Anna Test');
  });

  it('getStatus before any check-in returns zero count', async () => {
    const adapter = createInMemorySheetsAdapter();
    const members = createMembersRepository(adapter);
    const checkins = createCheckinRepository(adapter, members);
    const created = await members.createMember({
      firstName: 'Erik',
      lastName: 'Berg',
    });
    const status = await checkins.getStatus(
      created.memberId,
      new Date('2026-05-21T12:00:00Z'),
    );
    assert.equal(status.checkedInToday, false);
    assert.equal(status.yearCount, 0);
  });

  it('throws when member is missing', async () => {
    const adapter = createInMemorySheetsAdapter();
    const members = createMembersRepository(adapter);
    const checkins = createCheckinRepository(adapter, members);
    await assert.rejects(
      () =>
        checkins.checkIn({
          memberId: '00000000-0000-4000-8000-000000000000',
          firstName: 'X',
          lastName: 'Y',
        }),
      (err) => err instanceof MemberNotFoundError,
    );
  });
});
