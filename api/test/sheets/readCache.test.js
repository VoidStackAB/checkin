import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createReadCache } from '../../src/sheets/readCache.js';

describe('createReadCache', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['Date'], now: 0 });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it('returns cached value within TTL', () => {
    const cache = createReadCache(1000);
    cache.set('k', 'v');
    assert.equal(cache.get('k'), 'v');
    mock.timers.setTime(999);
    assert.equal(cache.get('k'), 'v');
  });

  it('expires entries after TTL', () => {
    const cache = createReadCache(1000);
    cache.set('k', 'v');
    mock.timers.setTime(1000);
    assert.equal(cache.get('k'), undefined);
  });

  it('invalidatePrefix removes matching keys only', () => {
    const cache = createReadCache(60_000);
    cache.set('members:meta', 1);
    cache.set('members:rows', 2);
    cache.set('checkins:rows:2025', 3);
    cache.invalidatePrefix('members:');
    assert.equal(cache.get('members:meta'), undefined);
    assert.equal(cache.get('members:rows'), undefined);
    assert.equal(cache.get('checkins:rows:2025'), 3);
  });
});
