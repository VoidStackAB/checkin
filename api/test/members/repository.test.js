import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMembersRepository } from '../../src/members/repository.js';
import { createInMemorySheetsAdapter } from '../../src/sheets/inMemoryAdapter.js';
import { MEMBERS_HEADERS } from '../../src/sheets/constants.js';
import { SheetsError } from '../../src/sheets/errors.js';

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

  it('match reads sheet and returns empty candidates in v1', async () => {
    const adapter = createInMemorySheetsAdapter();
    const repo = createMembersRepository(adapter);
    await repo.createMember({ firstName: 'Erik', lastName: 'Berg' });
    const match = await repo.matchMembers({
      firstName: 'Erik',
      lastName: 'Berg',
    });
    assert.deepEqual(match, { candidates: [] });
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
    };
    const repo = createMembersRepository(adapter);
    await assert.rejects(
      () => repo.createMember({ firstName: 'A', lastName: 'B' }),
      (err) => err instanceof SheetsError && err.code === 'sheet_setup_invalid',
    );
  });
});
