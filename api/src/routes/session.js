import { Router } from 'express';
import { isRequestUnlocked } from '../clubUnlock/cookie.js';

export function createSessionRouter(config) {
  const router = Router();

  router.get('/session', (req, res) => {
    res.json({ unlocked: isRequestUnlocked(req, config) });
  });

  return router;
}
