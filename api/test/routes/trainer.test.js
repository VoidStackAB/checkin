import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createInMemorySheetsAdapter } from '../../src/sheets/inMemoryAdapter.js';
import { resetRateLimits } from '../../src/clubUnlock/rateLimit.js';

const PAST_DATE = '2026-01-15';

function buildApp() {
  const adapter = createInMemorySheetsAdapter();
  adapter._seedGroup({ groupId: 1, name: 'Måndagsträning' });
  const config = {
    clubPin: 'hemlig',
    trainerPin: 'coach',
    sessionSecret: 'trainer-route-secret',
    cookieSecure: false,
    defaultGroupName: 'Klubben',
    sheetsAdapter: adapter,
  };
  return createApp(config);
}

function clubAgent(app) {
  const agent = request.agent(app);
  return agent.post('/api/unlock').send({ pin: 'hemlig' }).then(() => agent);
}

function trainerAgent(app) {
  const agent = request.agent(app);
  return agent
    .post('/api/trainer/unlock')
    .send({ pin: 'coach' })
    .then(() => agent);
}

// Seed a member who checked in on PAST_DATE in the given group, using the
// member-facing API (which requires the club PIN).
async function seedCheckin(app, { firstName, lastName, groupId }) {
  const agent = await clubAgent(app);
  const created = await agent
    .post('/api/members')
    .send({ firstName, lastName })
    .expect(201);
  const memberId = created.body.memberId;
  if (groupId !== 'default') {
    await agent.post('/api/me/groups').send({ memberId, groupId }).expect(200);
  }
  await agent
    .post('/api/me/checkins')
    .send({ memberId, firstName, lastName, groupId, date: PAST_DATE })
    .expect(200);
  return memberId;
}

describe('trainer routes', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('requires the trainer password for the report', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/trainer/report')
      .query({ date: PAST_DATE, groupId: 'default' })
      .expect(401);
    assert.equal(res.body.error, 'trainer_unlock_required');
  });

  it('does not grant report access via the club PIN', async () => {
    const app = buildApp();
    const agent = await clubAgent(app);
    const res = await agent
      .get('/api/trainer/report')
      .query({ date: PAST_DATE, groupId: 'default' })
      .expect(401);
    assert.equal(res.body.error, 'trainer_unlock_required');
  });

  it('rejects a wrong trainer password', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/trainer/unlock')
      .send({ pin: 'nope' })
      .expect(401);
    assert.equal(res.body.error, 'invalid_pin');
  });

  it('unlocks and reports session state', async () => {
    const app = buildApp();
    const agent = await trainerAgent(app);
    const session = await agent.get('/api/trainer/session').expect(200);
    assert.equal(session.body.unlocked, true);
  });

  it('lists everyone who checked in on a day for a group', async () => {
    const app = buildApp();
    await seedCheckin(app, {
      firstName: 'Anna',
      lastName: 'Svensson',
      groupId: '1',
    });
    await seedCheckin(app, {
      firstName: 'Erik',
      lastName: 'Berg',
      groupId: '1',
    });

    const agent = await trainerAgent(app);
    const res = await agent
      .get('/api/trainer/report')
      .query({ date: PAST_DATE, groupId: '1' })
      .expect(200);

    assert.equal(res.body.count, 2);
    assert.deepEqual(
      res.body.checkins.map((c) => c.name),
      ['Anna Svensson', 'Erik Berg'],
    );
  });

  it('scopes the report to the requested group', async () => {
    const app = buildApp();
    await seedCheckin(app, {
      firstName: 'Anna',
      lastName: 'Svensson',
      groupId: '1',
    });

    const agent = await trainerAgent(app);
    const groupReport = await agent
      .get('/api/trainer/report')
      .query({ date: PAST_DATE, groupId: '1' })
      .expect(200);
    assert.equal(groupReport.body.count, 1);

    const defaultReport = await agent
      .get('/api/trainer/report')
      .query({ date: PAST_DATE, groupId: 'default' })
      .expect(200);
    assert.equal(defaultReport.body.count, 0);
  });

  it('defaults to the default group and rejects bad dates', async () => {
    const app = buildApp();
    await seedCheckin(app, {
      firstName: 'Sara',
      lastName: 'Lind',
      groupId: 'default',
    });

    const agent = await trainerAgent(app);
    const defaulted = await agent
      .get('/api/trainer/report')
      .query({ date: PAST_DATE })
      .expect(200);
    assert.equal(defaulted.body.groupId, 'default');
    assert.equal(defaulted.body.count, 1);

    const bad = await agent
      .get('/api/trainer/report')
      .query({ date: 'not-a-date' })
      .expect(400);
    assert.equal(bad.body.error, 'invalid_date');
  });

  it('lists all groups for the selector', async () => {
    const app = buildApp();
    const agent = await trainerAgent(app);
    const res = await agent.get('/api/trainer/groups').expect(200);
    assert.deepEqual(
      res.body.groups.map((g) => g.groupId),
      ['default', '1'],
    );
  });
});
