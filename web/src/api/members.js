import { apiFetch } from './apiFetch.js';

const SHEETS_ERROR_COPY = {
  sheets_unavailable: 'Tjänsten är tillfälligt otillgänglig — försök igen om en stund.',
  sheets_forbidden: 'Kunde inte nå kalkylbladet — be en tränare kontrollera uppsättningen.',
  sheet_setup_invalid: 'Medlemsarket är felkonfigurerat — be en tränare fixa kalkylbladet.',
  member_create_failed: 'Kunde inte skapa profil — försök igen.',
};

export function sheetsErrorMessage(code) {
  return SHEETS_ERROR_COPY[code] ?? 'Något gick fel — försök igen.';
}

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function matchMembers(firstName, lastName) {
  const res = await apiFetch('/api/members/match', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName }),
  });
  return parseJsonResponse(res);
}

export async function createMember(firstName, lastName) {
  const res = await apiFetch('/api/members', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName }),
  });
  return parseJsonResponse(res);
}
