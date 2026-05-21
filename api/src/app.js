import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.js';
import { createRequireUnlock } from './clubUnlock/middleware.js';
import { healthRouter } from './routes/health.js';
import { createUnlockRouter } from './routes/unlock.js';
import { createSessionRouter } from './routes/session.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.resolve(__dirname, '../../web/dist');

export function createApp(config = loadConfig()) {
  const app = express();

  const api = express.Router();
  api.use(express.json());
  api.use(cookieParser());

  api.use(healthRouter);
  api.use(createUnlockRouter(config));
  api.use(createSessionRouter(config));
  api.use(createRequireUnlock(config));
  api.all('*', (_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  app.use('/api', api);

  app.use(express.static(WEB_DIST));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(WEB_DIST, 'index.html'), (err) => {
      if (err) {
        next(err);
      }
    });
  });

  return app;
}
