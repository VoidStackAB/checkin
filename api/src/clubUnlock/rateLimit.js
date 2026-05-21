const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

/** @type {Map<string, { count: number, windowStart: number }>} */
const failuresByIp = new Map();

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

export function isRateLimited(ip) {
  const entry = failuresByIp.get(ip);
  if (!entry) {
    return false;
  }
  if (Date.now() - entry.windowStart > WINDOW_MS) {
    failuresByIp.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(ip) {
  const now = Date.now();
  let entry = failuresByIp.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { count: 0, windowStart: now };
  }
  entry.count += 1;
  failuresByIp.set(ip, entry);
  return entry.count;
}

export function clearFailures(ip) {
  failuresByIp.delete(ip);
}

/** @internal */
export function resetRateLimits() {
  failuresByIp.clear();
}
