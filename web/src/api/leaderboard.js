import { apiFetch } from './apiFetch.js';

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function getLeaderboard() {
  const res = await apiFetch('/api/leaderboard');
  return parseJsonResponse(res);
}
