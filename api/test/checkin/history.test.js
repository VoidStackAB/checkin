import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createInMemorySheetsAdapter } from '../../src/sheets/inMemoryAdapter.js';

function buildApp() {
  const adapter = createInMemorySheetsAdapter();
  adapter._seedGroup({ groupId: 1, name: 'Måndagsträning' });
  const config = {
    clubPin: 'hemlig',
    sessionSecret: 'history-route-secret',
    cookieSecure: false,
    defaultGroupName: 'Klubben',
    sheetsAdapter: adapter,
  };
  return createApp(config);
}

function unlockAgent(app) {
  const agent = request.agent(app);
  return agent.post('/api/unlock').send({ pin: 'hemlig' }).then(() => agent);
}

function today() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('history and backfill routes', () => {
  it('requires unlock', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/me/checkins')
      .query({ memberId: 'x' })
      .expect(401);
    assert.equal(res.body.error, 'unlock_required');
  });

  it('returns an empty history for a new member', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Anna', lastName: 'Svensson' })
      .expect(201);

    const res = await agent
      .get('/api/me/checkins')
      .query({ memberId: created.body.memberId })
      .expect(200);
    assert.deepEqual(res.body.counts, {});
    assert.equal(res.body.dayCount, 0);
    assert.equal(res.body.checkinCount, 0);
    assert.equal(typeof res.body.year, 'number');
  });

  it('backfills a missed day and reflects it in history', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Anna', lastName: 'Svensson' })
      .expect(201);
    const memberId = created.body.memberId;

    const year = new Date().getFullYear();
    const missedDate = `${year}-01-02`;

    const added = await agent
      .post('/api/me/checkins')
      .send({ memberId, firstName: 'Anna', lastName: 'Svensson', date: missedDate })
      .expect(200);
    assert.equal(added.body.status, 'checked_in');
    assert.equal(added.body.date, missedDate);
    assert.equal(added.body.yearCount, 1);

    const history = await agent
      .get('/api/me/checkins')
      .query({ memberId, year })
      .expect(200);
    assert.equal(history.body.counts[missedDate], 1);
    assert.equal(history.body.dayCount, 1);
    assert.equal(history.body.checkinCount, 1);
    assert.equal(history.body.entries.length, 1);
    assert.equal(history.body.entries[0].date, missedDate);
    assert.equal(history.body.entries[0].groupId, 'default');
  });

  it('is idempotent for an already checked-in day', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Anna', lastName: 'Svensson' })
      .expect(201);
    const memberId = created.body.memberId;
    const date = `${new Date().getFullYear()}-01-03`;

    await agent
      .post('/api/me/checkins')
      .send({ memberId, firstName: 'Anna', lastName: 'Svensson', date })
      .expect(200);
    const again = await agent
      .post('/api/me/checkins')
      .send({ memberId, firstName: 'Anna', lastName: 'Svensson', date })
      .expect(200);
    assert.equal(again.body.status, 'already_checked_in');
    assert.equal(again.body.yearCount, 1);
  });

  it('rejects future dates', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Anna', lastName: 'Svensson' })
      .expect(201);

    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const futureDate = `${future.getFullYear()}-01-01`;

    const res = await agent
      .post('/api/me/checkins')
      .send({
        memberId: created.body.memberId,
        firstName: 'Anna',
        lastName: 'Svensson',
        date: futureDate,
      })
      .expect(400);
    assert.equal(res.body.error, 'invalid_date');
  });

  it('rejects malformed dates', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Anna', lastName: 'Svensson' })
      .expect(201);

    const res = await agent
      .post('/api/me/checkins')
      .send({
        memberId: created.body.memberId,
        firstName: 'Anna',
        lastName: 'Svensson',
        date: '2026-13-40',
      })
      .expect(400);
    assert.equal(res.body.error, 'invalid_date');
  });

  it('rejects backfill for a group the member has not joined', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Erik', lastName: 'Berg' })
      .expect(201);

    const res = await agent
      .post('/api/me/checkins')
      .send({
        memberId: created.body.memberId,
        firstName: 'Erik',
        lastName: 'Berg',
        groupId: '1',
        date: `${new Date().getFullYear()}-01-04`,
      })
      .expect(403);
    assert.equal(res.body.error, 'not_in_group');
  });

  it('today check-in and backfill aggregate across groups', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Anna', lastName: 'Svensson' })
      .expect(201);
    const memberId = created.body.memberId;
    await agent.post('/api/me/groups').send({ memberId, groupId: '1' }).expect(200);

    const todayDate = today();
    await agent
      .post('/api/checkin')
      .send({ memberId, firstName: 'Anna', lastName: 'Svensson' })
      .expect(200);
    await agent
      .post('/api/checkin')
      .send({ memberId, firstName: 'Anna', lastName: 'Svensson', groupId: '1' })
      .expect(200);

    const history = await agent
      .get('/api/me/checkins')
      .query({ memberId })
      .expect(200);
    assert.equal(history.body.counts[todayDate], 2);
    assert.equal(history.body.dayCount, 1);
    assert.equal(history.body.checkinCount, 2);
    assert.equal(history.body.entries.length, 2);
    assert.deepEqual(
      history.body.entries.map((e) => e.groupId).sort(),
      ['1', 'default'],
    );
  });
});
