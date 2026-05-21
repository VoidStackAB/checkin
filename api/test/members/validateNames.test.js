import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseMemberNames } from '../../src/members/validateNames.js';

describe('parseMemberNames', () => {
  it('trims and accepts valid names', () => {
    assert.deepEqual(parseMemberNames({ firstName: ' Anna ', lastName: 'Berg ' }), {
      firstName: 'Anna',
      lastName: 'Berg',
    });
  });

  it('rejects empty first name', () => {
    assert.equal(parseMemberNames({ firstName: '  ', lastName: 'Berg' }).error, 'invalid_format');
  });

  it('rejects missing body', () => {
    assert.equal(parseMemberNames(null).error, 'invalid_format');
  });
});
