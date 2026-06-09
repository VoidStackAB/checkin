import { apiFetch } from './apiFetch.js';
import { sheetsErrorMessage } from './sheetsErrors.js';

export { sheetsErrorMessage };

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function getAllGroups() {
  const res = await apiFetch('/api/groups');
  return parseJsonResponse(res);
}

export async function getMyGroups(memberId) {
  const params = new URLSearchParams({ memberId });
  const res = await apiFetch(`/api/me/groups?${params}`);
  return parseJsonResponse(res);
}

export async function joinGroup(memberId, groupId) {
  const res = await apiFetch('/api/me/groups', {
    method: 'POST',
    body: JSON.stringify({ memberId, groupId }),
  });
  return parseJsonResponse(res);
}

export async function leaveGroup(memberId, groupId) {
  const res = await apiFetch('/api/me/groups', {
    method: 'DELETE',
    body: JSON.stringify({ memberId, groupId }),
  });
  return parseJsonResponse(res);
}

export async function getGroupCheckins(memberId) {
  const params = new URLSearchParams({ memberId });
  const res = await apiFetch(`/api/me/group-checkins?${params}`);
  return parseJsonResponse(res);
}
