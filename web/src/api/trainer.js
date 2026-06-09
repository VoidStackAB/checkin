import { apiFetch } from './apiFetch.js';
import { sheetsErrorMessage } from './sheetsErrors.js';

export { sheetsErrorMessage };

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function getTrainerSession() {
  const res = await apiFetch('/api/trainer/session');
  if (!res.ok) {
    throw new Error('session_failed');
  }
  return res.json();
}

export async function unlockTrainer(pin) {
  const res = await apiFetch('/api/trainer/unlock', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
  return parseJsonResponse(res);
}

export async function getTrainerGroups() {
  const res = await apiFetch('/api/trainer/groups');
  return parseJsonResponse(res);
}

export async function getTrainerReport(date, groupId) {
  const params = new URLSearchParams({ date });
  if (groupId) {
    params.set('groupId', groupId);
  }
  const res = await apiFetch(`/api/trainer/report?${params}`);
  return parseJsonResponse(res);
}
