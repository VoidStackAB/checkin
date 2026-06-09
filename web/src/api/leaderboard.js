import { apiFetch } from './apiFetch.js';

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function getLeaderboard(groupId) {
  const query = groupId
    ? `?${new URLSearchParams({ groupId })}`
    : '';
  const res = await apiFetch(`/api/leaderboard${query}`);
  return parseJsonResponse(res);
}
