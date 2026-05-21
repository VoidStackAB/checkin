import { apiFetch } from './apiFetch.js';
import { sheetsErrorMessage } from './sheetsErrors.js';

export { sheetsErrorMessage };

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

export async function linkMember(memberId) {
  const res = await apiFetch('/api/members', {
    method: 'POST',
    body: JSON.stringify({ memberId }),
  });
  return parseJsonResponse(res);
}
