import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createInMemorySheetsAdapter } from '../../src/sheets/inMemoryAdapter.js';

const config = {
  clubPin: 'hemlig',
  sessionSecret: 'members-route-secret',
  cookieSecure: false,
  sheetsAdapter: createInMemorySheetsAdapter(),
};

function unlockAgent(app) {
  const agent = request.agent(app);
  return agent.post('/api/unlock').send({ pin: 'hemlig' }).then(() => agent);
}

describe('members routes', () => {
  const app = createApp(config);

  it('requires unlock for POST /api/members', async () => {
    const res = await request(app)
      .post('/api/members')
      .send({ firstName: 'Anna', lastName: 'Test' })
      .expect(401);
    assert.equal(res.body.error, 'unlock_required');
  });

  it('creates member and returns trimmed names', async () => {
    const agent = await unlockAgent(app);
    const res = await agent
      .post('/api/members')
      .send({ firstName: '  Anna ', lastName: 'Svensson ' })
      .expect(201);
    assert.match(res.body.memberId, /^[0-9a-f-]{36}$/i);
    assert.equal(res.body.firstName, 'Anna');
    assert.equal(res.body.lastName, 'Svensson');
  });

  it('returns invalid_format for empty names on create', async () => {
    const agent = await unlockAgent(app);
    const res = await agent
      .post('/api/members')
      .send({ firstName: '', lastName: 'X' })
      .expect(400);
    assert.equal(res.body.error, 'invalid_format');
  });

  it('match returns fuzzy candidates', async () => {
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Erik', lastName: 'Andersson' })
      .expect(201);

    const res = await agent
      .post('/api/members/match')
      .send({ firstName: 'Erik', lastName: 'Anderson' })
      .expect(200);

    assert.equal(res.body.candidates.length, 1);
    assert.equal(res.body.candidates[0].memberId, created.body.memberId);
    assert.equal(res.body.candidates[0].displayName, 'Erik Andersson');
    assert.equal(res.body.candidates[0].firstName, 'Erik');
    assert.equal(res.body.candidates[0].lastName, 'Andersson');
    assert.equal(res.body.candidates[0].yearCount, 0);
  });

  it('links existing member by memberId only', async () => {
    const agent = await unlockAgent(app);
    const created = await agent
      .post('/api/members')
      .send({ firstName: 'Karl', lastName: 'Svensson' })
      .expect(201);

    const res = await agent
      .post('/api/members')
      .send({ memberId: created.body.memberId })
      .expect(200);

    assert.equal(res.body.memberId, created.body.memberId);
    assert.equal(res.body.firstName, 'Karl');
    assert.equal(res.body.lastName, 'Svensson');
  });

  it('link returns member_not_found for unknown id', async () => {
    const agent = await unlockAgent(app);
    const res = await agent
      .post('/api/members')
      .send({ memberId: '00000000-0000-4000-8000-000000000000' })
      .expect(404);
    assert.equal(res.body.error, 'member_not_found');
  });

  it('create still requires names when memberId is absent', async () => {
    const agent = await unlockAgent(app);
    const res = await agent.post('/api/members').send({}).expect(400);
    assert.equal(res.body.error, 'invalid_format');
  });
});
