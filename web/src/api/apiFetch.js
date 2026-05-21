export async function apiFetch(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(path, {
    ...options,
    credentials: 'include',
    headers,
  });
}

export async function getSession() {
  const res = await apiFetch('/api/session');
  if (!res.ok) {
    throw new Error('session_failed');
  }
  return res.json();
}

export async function unlockPin(pin) {
  const res = await apiFetch('/api/unlock', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
