import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createInMemorySheetsAdapter } from '../../src/sheets/inMemoryAdapter.js';

function buildApp() {
  const adapter = createInMemorySheetsAdapter();
  adapter._seedGroup({ groupId: 1, name: 'Måndagsträning' });
  adapter._seedGroup({ groupId: 2, name: 'Tävlingsgrupp' });
  const config = {
    clubPin: 'hemlig',
    sessionSecret: 'groups-route-secret',
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

describe('groups routes', () => {
  it('requires unlock', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/me/groups')
      .query({ memberId: 'x' })
      .expect(401);
    assert.equal(res.body.error, 'unlock_required');
  });

  it('lists, joins, checks in, and leaves groups', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Anna', lastName: 'Svensson' })
      .expect(201);
    const memberId = created.body.memberId;

    const initial = await agent
      .get('/api/me/groups')
      .query({ memberId })
      .expect(200);
    assert.deepEqual(
      initial.body.groups.map((g) => g.groupId),
      ['default', '1', '2'],
    );
    assert.equal(initial.body.groups.find((g) => g.isDefault).name, 'Klubben');
    assert.equal(initial.body.groups.find((g) => g.isDefault).isMember, true);

    const joined = await agent
      .post('/api/me/groups')
      .send({ memberId, groupId: '1' })
      .expect(200);
    assert.equal(
      joined.body.groups.find((g) => g.groupId === '1').isMember,
      true,
    );

    const checkin = await agent
      .post('/api/checkin')
      .send({
        memberId,
        firstName: 'Anna',
        lastName: 'Svensson',
        groupId: '1',
      })
      .expect(200);
    assert.equal(checkin.body.status, 'checked_in');
    assert.equal(checkin.body.groupId, '1');

    const summary = await agent
      .get('/api/me/group-checkins')
      .query({ memberId })
      .expect(200);
    const g1 = summary.body.groups.find((g) => g.groupId === '1');
    assert.equal(g1.checkedInToday, true);
    assert.equal(g1.yearCount, 1);

    const left = await agent
      .delete('/api/me/groups')
      .send({ memberId, groupId: '1' })
      .expect(200);
    assert.equal(
      left.body.groups.find((g) => g.groupId === '1').isMember,
      false,
    );
  });

  it('lists all groups publicly and leaves the default group', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Erik', lastName: 'Berg' })
      .expect(201);
    const memberId = created.body.memberId;

    const all = await agent.get('/api/groups').expect(200);
    assert.deepEqual(
      all.body.groups.map((g) => g.groupId),
      ['default', '1', '2'],
    );

    const left = await agent
      .delete('/api/me/groups')
      .send({ memberId, groupId: 'default' })
      .expect(200);
    assert.equal(left.body.groups.find((g) => g.isDefault).isMember, false);

    const blocked = await agent
      .post('/api/checkin')
      .send({ memberId, firstName: 'Erik', lastName: 'Berg' })
      .expect(403);
    assert.equal(blocked.body.error, 'not_in_group');
  });

  it('leaderboard can be filtered by group', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Anna', lastName: 'Svensson' })
      .expect(201);
    const memberId = created.body.memberId;
    await agent.post('/api/me/groups').send({ memberId, groupId: '1' }).expect(200);
    await agent
      .post('/api/checkin')
      .send({ memberId, firstName: 'Anna', lastName: 'Svensson', groupId: '1' })
      .expect(200);

    const defaultBoard = await agent.get('/api/leaderboard').expect(200);
    assert.equal(defaultBoard.body.entries.length, 0);

    const groupBoard = await agent
      .get('/api/leaderboard')
      .query({ groupId: '1' })
      .expect(200);
    assert.equal(groupBoard.body.entries.length, 1);
    assert.equal(groupBoard.body.entries[0].firstName, 'Anna');
  });

  it('rejects check-in for a group the member has not joined', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Erik', lastName: 'Berg' })
      .expect(201);
    const res = await agent
      .post('/api/checkin')
      .send({
        memberId: created.body.memberId,
        firstName: 'Erik',
        lastName: 'Berg',
        groupId: '2',
      })
      .expect(403);
    assert.equal(res.body.error, 'not_in_group');
  });

  it('404 for unknown group on join', async () => {
    const app = buildApp();
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Erik', lastName: 'Berg' })
      .expect(201);
    const res = await agent
      .post('/api/me/groups')
      .send({ memberId: created.body.memberId, groupId: '99' })
      .expect(404);
    assert.equal(res.body.error, 'group_not_found');
  });
});
