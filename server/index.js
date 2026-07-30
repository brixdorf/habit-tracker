import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { db } from './src/db.js';
import { SqliteSessionStore } from './src/lib/sqliteSessionStore.js';
import { authRouter, requireAuth } from './src/routes/auth.js';
import { habitsRouter } from './src/routes/habits.js';
import { notesRouter } from './src/routes/notes.js';
import { importExportRouter } from './src/routes/importExport.js';
import { metaRouter } from './src/routes/meta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET must be set in production. Refusing to start with an insecure default.');
  process.exit(1);
}

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

const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Habit Tracker server listening on port ${port}`);
});
