import { apiFetch } from './apiFetch.js';
import { sheetsErrorMessage } from './sheetsErrors.js';
import { syncMemberIdentityFromStatus } from '../storage/member.js';

export { sheetsErrorMessage };

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function getMeStatus(memberId) {
  const params = new URLSearchParams({ memberId });
  const res = await apiFetch(`/api/me/status?${params}`);
  const parsed = await parseJsonResponse(res);
  if (parsed.ok && parsed.data.firstName && parsed.data.lastName) {
    syncMemberIdentityFromStatus({
      memberId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    });
  }
  return parsed;
}

export async function postCheckin({ memberId, firstName, lastName, groupId }) {
  const res = await apiFetch('/api/checkin', {
    method: 'POST',
    body: JSON.stringify({
      memberId,
      firstName,
      lastName,
      ...(groupId ? { groupId } : {}),
    }),
  });
  return parseJsonResponse(res);
}

export function memberNotFoundMessage() {
  return 'Hittade inte dig — registrera dig igen.';
}
