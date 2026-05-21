import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { COOKIE_NAME, signUnlockToken } from '../../src/clubUnlock/cookie.js';

const config = {
  clubPin: 'sekret',
  sessionSecret: 'middleware-test-secret',
  cookieSecure: false,
};

describe('requireUnlock middleware', () => {
  const app = createApp(config);

  it('allows public routes without cookie', async () => {
    await request(app).get('/api/health').expect(200);
    await request(app).get('/api/session').expect(200, { unlocked: false });
  });

  it('blocks unknown api routes without unlock', async () => {
    const res = await request(app).get('/api/members').expect(401);
    assert.equal(res.body.error, 'unlock_required');
  });

  it('allows unknown routes with valid cookie', async () => {
    const token = signUnlockToken(config);
    const res = await request(app)
      .get('/api/members')
      .set('Cookie', `${COOKIE_NAME}=${token}`)
      .expect(404);
    assert.equal(res.body.error, 'not_found');
  });
});
