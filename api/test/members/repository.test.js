import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMembersRepository } from '../../src/members/repository.js';
import { createCheckinRepository } from '../../src/checkin/repository.js';
import { createInMemorySheetsAdapter } from '../../src/sheets/inMemoryAdapter.js';
import { MEMBERS_HEADERS } from '../../src/sheets/constants.js';
import { SheetsError } from '../../src/sheets/errors.js';
import { MemberNotFoundError } from '../../src/checkin/errors.js';

describe('members repository', () => {
  it('creates tab and member on first create', async () => {
    const adapter = createInMemorySheetsAdapter();
    const repo = createMembersRepository(adapter);
    const created = await repo.createMember({
      firstName: 'Erik',
      lastName: 'Bergström',
    });
    assert.match(created.memberId, /^[0-9a-f-]{36}$/i);
    assert.equal(created.firstName, 'Erik');
    assert.equal(created.lastName, 'Bergström');

    const snap = adapter._snapshot();
    assert.deepEqual(snap.headers, MEMBERS_HEADERS);
    assert.equal(snap.rows.length, 1);
    assert.equal(snap.rows[0].optOutRanking, false);
    assert.ok(snap.rows[0].createdAt);
  });

  it('match returns ranked candidates with yearCount', async () => {
    const adapter = createInMemorySheetsAdapter();
    const members = createMembersRepository(adapter);
    const checkins = createCheckinRepository(adapter, members);
    const created = await members.createMember({
      firstName: 'Erik',
      lastName: 'Andersson',
    });
    await checkins.checkIn({
      memberId: created.memberId,
      firstName: 'Erik',
      lastName: 'Andersson',
    });

    const match = await members.matchMembers({
      firstName: 'Erik',
      lastName: 'Anderson',
    });
    assert.equal(match.candidates.length, 1);
    assert.equal(match.candidates[0].memberId, created.memberId);
    assert.equal(match.candidates[0].displayName, 'Erik Andersson');
    assert.equal(match.candidates[0].yearCount, 1);
  });

  it('linkMember returns sheet names without creating a row', async () => {
    const adapter = createInMemorySheetsAdapter();
    const repo = createMembersRepository(adapter);
    const created = await repo.createMember({
      firstName: 'Karl',
      lastName: 'Svensson',
    });
    const linked = await repo.linkMember(created.memberId);
    assert.equal(linked.firstName, 'Karl');
    assert.equal(linked.lastName, 'Svensson');
    assert.equal(adapter._snapshot().rows.length, 1);
  });

  it('linkMember throws when member is missing', async () => {
    const adapter = createInMemorySheetsAdapter();
    const repo = createMembersRepository(adapter);
    await assert.rejects(
      () =>
        repo.linkMember('00000000-0000-4000-8000-000000000000'),
      (err) => err instanceof MemberNotFoundError,
    );
  });

  it('rejects wrong headers', async () => {
    const adapter = {
      async getMembersTabMeta() {
        return { exists: true, headers: ['wrong'] };
      },
      async createMembersTab() {
        throw new Error('unexpected');
      },
      async listMemberRows() {
        return [];
      },
      async appendMemberRow() {},
      async getCheckinsTabMeta() {
        return { exists: false, headers: null };
      },
      async listCheckinRows() {
        return [];
      },
    };
    const repo = createMembersRepository(adapter);
    await assert.rejects(
      () => repo.createMember({ firstName: 'A', lastName: 'B' }),
      (err) => err instanceof SheetsError && err.code === 'sheet_setup_invalid',
    );
  });
});
