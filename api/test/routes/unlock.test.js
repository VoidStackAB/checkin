import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  COOKIE_NAME,
  signUnlockToken,
  verifyUnlockToken,
} from '../../src/clubUnlock/cookie.js';
import { resetRateLimits } from '../../src/clubUnlock/rateLimit.js';

const config = {
  clubPin: 'hemlig',
  sessionSecret: 'unlock-route-secret',
  cookieSecure: false,
};

describe('unlock and session routes', () => {
  const app = createApp(config);

  beforeEach(() => {
    resetRateLimits();
  });

  it('unlocks with correct pin and sets cookie', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post('/api/unlock')
      .send({ pin: 'hemlig' })
      .expect(200);

    assert.equal(res.body.ok, true);
    const cookie = res.headers['set-cookie']?.find((c) =>
      c.startsWith(`${COOKIE_NAME}=`),
    );
    assert.ok(cookie);
    assert.match(cookie, /httponly/i);
    assert.doesNotMatch(cookie, /max-age/i);

    const session = await agent.get('/api/session').expect(200);
    assert.equal(session.body.unlocked, true);
  });

  it('returns invalid_pin for wrong pin', async () => {
    const res = await request(app)
      .post('/api/unlock')
      .send({ pin: 'wrong' })
      .expect(401);
    assert.equal(res.body.error, 'invalid_pin');
  });

  it('returns invalid_format for empty pin', async () => {
    const res = await request(app)
      .post('/api/unlock')
      .send({ pin: '' })
      .expect(400);
    assert.equal(res.body.error, 'invalid_format');
  });

  it('rate limits after repeated failures', async () => {
    const agent = request.agent(app);
    for (let i = 0; i < 10; i += 1) {
      await agent.post('/api/unlock').send({ pin: 'wrong' }).expect(401);
    }
    const res = await agent.post('/api/unlock').send({ pin: 'wrong' });
    assert.equal(res.status, 429);
    assert.equal(res.body.error, 'rate_limited');
  });

  it('session reports unlocked false without cookie', async () => {
    await request(app).get('/api/session').expect(200, { unlocked: false });
  });

  it('cookie invalid after pin rotation', async () => {
    const token = signUnlockToken(config);
    const rotatedApp = createApp({ ...config, clubPin: 'ny-pin' });
    const res = await request(rotatedApp)
      .get('/api/session')
      .set('Cookie', `${COOKIE_NAME}=${token}`)
      .expect(200);
    assert.equal(res.body.unlocked, false);
    assert.equal(verifyUnlockToken(token, { ...config, clubPin: 'ny-pin' }), false);
  });
});
