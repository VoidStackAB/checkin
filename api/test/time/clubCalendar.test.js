import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDateString,
  calendarYear,
  formatTimestamp,
  getClubTimeZone,
} from '../../src/time/clubCalendar.js';

const ORIGINAL_TZ = process.env.TZ;

describe('club calendar', () => {
  before(() => {
    process.env.TZ = 'Europe/Stockholm';
  });

  after(() => {
    if (ORIGINAL_TZ === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = ORIGINAL_TZ;
    }
  });

  it('uses TZ from environment', () => {
    assert.equal(getClubTimeZone(), 'Europe/Stockholm');
  });

  it('calendarDateString uses Stockholm calendar day', () => {
    const utcLate = new Date('2026-01-01T22:30:00Z');
    assert.equal(calendarDateString(utcLate), '2026-01-01');
  });

  it('calendarYear matches Stockholm year at year boundary', () => {
    assert.equal(calendarYear(new Date('2026-12-31T23:00:00Z')), 2027);
    assert.equal(calendarYear(new Date('2026-12-31T21:00:00Z')), 2026);
  });

  it('formatTimestamp includes time in club zone', () => {
    const ts = formatTimestamp(new Date('2026-05-21T10:00:00Z'));
    assert.match(ts, /^2026-05-21 \d{2}:\d{2}:\d{2}$/);
  });

  it('respects alternate TZ when set', () => {
    process.env.TZ = 'America/New_York';
    const date = new Date('2026-07-15T06:00:00Z');
    assert.equal(calendarDateString(date), '2026-07-15');
    process.env.TZ = 'Europe/Stockholm';
  });
});
