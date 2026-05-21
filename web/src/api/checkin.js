import { apiFetch } from './apiFetch.js';
import { sheetsErrorMessage } from './sheetsErrors.js';

export { sheetsErrorMessage };

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function getMeStatus(memberId) {
  const params = new URLSearchParams({ memberId });
  const res = await apiFetch(`/api/me/status?${params}`);
  return parseJsonResponse(res);
}

export async function postCheckin({ memberId, firstName, lastName }) {
  const res = await apiFetch('/api/checkin', {
    method: 'POST',
    body: JSON.stringify({ memberId, firstName, lastName }),
  });
  return parseJsonResponse(res);
}

export function memberNotFoundMessage() {
  return 'Hittade inte dig — registrera dig igen.';
}
