import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createInMemorySheetsAdapter } from '../../src/sheets/inMemoryAdapter.js';

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

describe('checkin routes', () => {
  const app = createApp(config);

  it('requires unlock', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .send({
        memberId: 'x',
        firstName: 'A',
        lastName: 'B',
      })
      .expect(401);
    assert.equal(res.body.error, 'unlock_required');
  });

  it('check-in and status flow', async () => {
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Anna', lastName: 'Svensson' })
      .expect(201);

    const statusBefore = await agent
      .get('/api/me/status')
      .query({ memberId: created.body.memberId })
      .expect(200);
    assert.equal(statusBefore.body.checkedInToday, false);
    assert.equal(statusBefore.body.yearCount, 0);

    const checkin = await agent
      .post('/api/checkin')
      .send({
        memberId: created.body.memberId,
        firstName: 'Anna',
        lastName: 'Svensson',
      })
      .expect(200);
    assert.equal(checkin.body.status, 'checked_in');
    assert.equal(checkin.body.yearCount, 1);
    assert.match(checkin.body.date, /^\d{4}-\d{2}-\d{2}$/);

    const again = await agent
      .post('/api/checkin')
      .send({
        memberId: created.body.memberId,
        firstName: 'Anna',
        lastName: 'Svensson',
      })
      .expect(200);
    assert.equal(again.body.status, 'already_checked_in');
    assert.equal(again.body.yearCount, 1);

    const statusAfter = await agent
      .get('/api/me/status')
      .query({ memberId: created.body.memberId })
      .expect(200);
    assert.equal(statusAfter.body.checkedInToday, true);
    assert.equal(statusAfter.body.yearCount, 1);
  });

  it('returns member_not_found for unknown id', async () => {
    const agent = await unlockAgent(app);
    const res = await agent
      .post('/api/checkin')
      .send({
        memberId: '00000000-0000-4000-8000-000000000000',
        firstName: 'A',
        lastName: 'B',
      })
      .expect(404);
    assert.equal(res.body.error, 'member_not_found');
  });
});
