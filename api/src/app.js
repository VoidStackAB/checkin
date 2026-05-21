import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { healthRouter } from './routes/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.resolve(__dirname, '../../web/dist');

export function createApp() {
  const app = express();

  app.use('/api', healthRouter);

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
