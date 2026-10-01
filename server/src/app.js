import express from 'express';
import session from 'express-session';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { db } from './db.js';
import { SqliteSessionStore } from './lib/sqliteSessionStore.js';
import { authRouter, requireAuth } from './routes/auth.js';
import { habitsRouter } from './routes/habits.js';
import { notesRouter } from './routes/notes.js';
import { importExportRouter } from './routes/importExport.js';
import { metaRouter } from './routes/meta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));

  app.use(
    session({
      name: 'habit_tracker.sid',
      secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      store: new SqliteSessionStore(db),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction ? 'auto' : false,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use('/api/auth', authRouter);
  app.use('/api/habits', requireAuth, habitsRouter);
  app.use('/api/notes', requireAuth, notesRouter);
  app.use('/api', requireAuth, importExportRouter);
  app.use('/api/meta', requireAuth, metaRouter);

  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
