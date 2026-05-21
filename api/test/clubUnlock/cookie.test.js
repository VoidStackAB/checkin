import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  pinFingerprint,
  signUnlockToken,
  verifyUnlockToken,
} from '../../src/clubUnlock/cookie.js';

const baseConfig = {
  clubPin: '4242',
  sessionSecret: 'test-secret',
  cookieSecure: false,
};

describe('club unlock cookie', () => {
  it('signs and verifies a valid token', () => {
    const token = signUnlockToken(baseConfig);
    assert.equal(verifyUnlockToken(token, baseConfig), true);
  });

  it('rejects token after club pin changes', () => {
    const token = signUnlockToken(baseConfig);
    const rotated = { ...baseConfig, clubPin: '9999' };
    assert.equal(verifyUnlockToken(token, rotated), false);
  });

  it('rejects tampered signature', () => {
    const token = signUnlockToken(baseConfig);
    const tampered = `${token}x`;
    assert.equal(verifyUnlockToken(tampered, baseConfig), false);
  });

  it('pin fingerprint changes with pin', () => {
    const a = pinFingerprint('12', baseConfig.sessionSecret);
    const b = pinFingerprint('123', baseConfig.sessionSecret);
    assert.notEqual(a, b);
  });
});
