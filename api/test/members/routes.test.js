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

  it('returns invalid_format for empty names', async () => {
    const agent = await unlockAgent(app);
    const res = await agent
      .post('/api/members')
      .send({ firstName: '', lastName: 'X' })
      .expect(400);
    assert.equal(res.body.error, 'invalid_format');
  });

  it('match returns empty candidates', async () => {
    const agent = await unlockAgent(app);
    await agent
      .post('/api/members')
      .send({ firstName: 'Erik', lastName: 'Berg' })
      .expect(201);
    const res = await agent
      .post('/api/members/match')
      .send({ firstName: 'Erik', lastName: 'Berg' })
      .expect(200);
    assert.deepEqual(res.body, { candidates: [] });
  });
});
