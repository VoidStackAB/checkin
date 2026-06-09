import { apiFetch } from './apiFetch.js';
import { sheetsErrorMessage } from './sheetsErrors.js';

export { sheetsErrorMessage };

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function getMyHistory(memberId, year) {
  const params = new URLSearchParams({ memberId });
  if (year) {
    params.set('year', String(year));
  }
  const res = await apiFetch(`/api/me/checkins?${params}`);
  return parseJsonResponse(res);
}

export async function addMissedCheckin({
  memberId,
  firstName,
  lastName,
  groupId,
  date,
}) {
  const res = await apiFetch('/api/me/checkins', {
    method: 'POST',
    body: JSON.stringify({
      memberId,
      firstName,
      lastName,
      date,
      ...(groupId ? { groupId } : {}),
    }),
  });
  return parseJsonResponse(res);
}
