import { isRequestUnlocked } from './cookie.js';

const PUBLIC_ROUTES = new Set([
  'GET:/health',
  'GET:/session',
  'POST:/unlock',
]);

function routeKey(req) {
  return `${req.method}:${req.path}`;
}

export function isPublicApiRoute(req) {
  return PUBLIC_ROUTES.has(routeKey(req));
}

export function createRequireUnlock(config) {
  return function requireUnlock(req, res, next) {
    if (isPublicApiRoute(req)) {
      return next();
    }
    if (isRequestUnlocked(req, config)) {
      return next();
    }
    res.status(401).json({ error: 'unlock_required' });
  };
}
