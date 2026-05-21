const DEFAULT_TTL_MS = 60 * 60 * 1000;

export function createReadCache(ttlMs = DEFAULT_TTL_MS) {
  const entries = new Map();

  function get(key) {
    const entry = entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() - entry.at >= ttlMs) {
      entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key, value) {
    entries.set(key, { value, at: Date.now() });
  }

  function invalidate(key) {
    entries.delete(key);
  }

  function invalidatePrefix(prefix) {
    for (const key of entries.keys()) {
      if (key.startsWith(prefix)) {
        entries.delete(key);
      }
    }
  }

  function clear() {
    entries.clear();
  }

  return { get, set, invalidate, invalidatePrefix, clear };
}
