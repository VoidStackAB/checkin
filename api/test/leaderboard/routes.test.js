import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createInMemorySheetsAdapter } from '../../src/sheets/inMemoryAdapter.js';
import { CHECKINS_HEADERS } from '../../src/sheets/constants.js';

const config = {
  clubPin: 'hemlig',
  sessionSecret: 'checkin-route-secret',
  cookieSecure: false,
  sheetsAdapter: createInMemorySheetsAdapter(),
};

function unlockAgent(app) {
  const agent = request.agent(app);
  return agent.post('/api/unlock').send({ pin: 'hemlig' }).then(() => agent);
}

describe('leaderboard routes', () => {
  const app = createApp(config);

  it('requires unlock', async () => {
    const res = await request(app).get('/api/leaderboard').expect(401);
    assert.equal(res.body.error, 'unlock_required');
  });

  it('returns entries and status rank', async () => {
    const agent = await unlockAgent(app);
    const adapter = config.sheetsAdapter;
    const a = await agent
      .post('/api/members')
      .send({ firstName: 'Anna', lastName: 'One' })
      .expect(201);
    const b = await agent
      .post('/api/members')
      .send({ firstName: 'Bob', lastName: 'Two' })
      .expect(201);

    await adapter.createCheckinsTab(2026, CHECKINS_HEADERS);
    await adapter.appendCheckinRow(2026, {
      memberId: a.body.memberId,
      date: '2026-05-20',
      displayName: 'Anna One',
    });
    await adapter.appendCheckinRow(2026, {
      memberId: a.body.memberId,
      date: '2026-05-21',
      displayName: 'Anna One',
    });
    await adapter.appendCheckinRow(2026, {
      memberId: b.body.memberId,
      date: '2026-05-21',
      displayName: 'Bob Two',
    });

    const board = await agent.get('/api/leaderboard').expect(200);
    assert.equal(board.body.entries.length, 2);
    assert.equal(board.body.entries[0].firstName, 'Anna');
    assert.equal(board.body.entries[0].rank, 1);
    assert.equal(board.body.entries[0].yearCount, 2);
    assert.equal(board.body.entries[1].rank, 2);

    const status = await agent
      .get('/api/me/status')
      .query({ memberId: b.body.memberId })
      .expect(200);
    assert.equal(status.body.rank, 2);
    assert.equal(status.body.yearCount, 1);
  });
});
