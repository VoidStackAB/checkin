import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  levenshteinRatio,
  normalizeFullName,
  rankMatchCandidates,
} from '../../src/members/fuzzyMatch.js';

describe('fuzzyMatch', () => {
  it('normalizeFullName trims, lowercases, and folds Swedish letters', () => {
    assert.equal(normalizeFullName('  Åsa ', ' Ängström '), 'asa angstrom');
    assert.equal(normalizeFullName('Örjan', 'Berg'), 'orjan berg');
  });

  it('levenshteinRatio is 1 for identical strings', () => {
    assert.equal(levenshteinRatio('erik berg', 'erik berg'), 1);
  });

  it('includes candidates at exactly 0.85 similarity', () => {
    const members = [
      {
        memberId: 'a',
        firstName: 'Test',
        lastName: 'Person',
        createdAt: '2026-01-01 10:00:00',
      },
    ];
    const query = 'Test Persn';
    const normQuery = normalizeFullName(
      query.split(' ')[0],
      query.split(' ')[1],
    );
    const normMember = normalizeFullName('Test', 'Person');
    const ratio = levenshteinRatio(normQuery, normMember);
    assert.ok(ratio >= 0.85);

    const ranked = rankMatchCandidates('Test', 'Persn', members);
    assert.equal(ranked.length, 1);
  });

  it('excludes candidates below 0.85 similarity', () => {
    const members = [
      {
        memberId: 'a',
        firstName: 'Anna',
        lastName: 'Bergström',
        createdAt: '2026-01-01 10:00:00',
      },
    ];
    const ranked = rankMatchCandidates('Completely', 'Different', members);
    assert.deepEqual(ranked, []);
  });

  it('returns at most three candidates ordered by score', () => {
    const members = [
      {
        memberId: '1',
        firstName: 'Erik',
        lastName: 'Andersson',
        createdAt: '2026-01-03 10:00:00',
      },
      {
        memberId: '2',
        firstName: 'Erik',
        lastName: 'Anderson',
        createdAt: '2026-01-02 10:00:00',
      },
      {
        memberId: '3',
        firstName: 'Erik',
        lastName: 'Andersen',
        createdAt: '2026-01-01 10:00:00',
      },
      {
        memberId: '4',
        firstName: 'Erik',
        lastName: 'Anders',
        createdAt: '2026-01-04 10:00:00',
      },
    ];
    const ranked = rankMatchCandidates('Erik', 'Andersson', members);
    assert.equal(ranked.length, 3);
    assert.ok(ranked[0].score >= ranked[1].score);
    assert.ok(ranked[1].score >= ranked[2].score);
  });

  it('breaks score ties by earlier createdAt', () => {
    const members = [
      {
        memberId: 'newer',
        firstName: 'Erik',
        lastName: 'Berg',
        createdAt: '2026-02-01 10:00:00',
      },
      {
        memberId: 'older',
        firstName: 'Erik',
        lastName: 'Berg',
        createdAt: '2026-01-01 10:00:00',
      },
    ];
    const ranked = rankMatchCandidates('Erik', 'Berg', members);
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0].score, ranked[1].score);
    assert.equal(ranked[0].member.memberId, 'older');
  });
});
