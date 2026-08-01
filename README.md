# Habit Tracker

A single-user habit tracker web app. Track daily habits across months in a grid view, set monthly goals, archive habits you no longer track, and keep month-scoped notes.

## Features

- Month-view grid with a row per habit and a column per day
- Per-habit monthly goals with a live achieved count
- Archiving habits (one-way, keeps historical data, prorates the goal for the archive month)
- Drag-and-drop reordering for habits and notes
- Month-scoped notes with pinning and manual ordering
- Full JSON export/import for backup and restore
- Dark and light mode
- All date logic runs in IST regardless of server or browser timezone

## Tech stack

- **Backend**: Node.js, Express 5, SQLite via better-sqlite3, express-session with a custom SQLite session store
- **Frontend**: React 19, Vite, Tailwind CSS v4, dnd-kit for drag-and-drop
- **Auth**: Single fixed user, credentials from environment variables, password hashed with bcryptjs

## Local setup

Requires Node.js 20 or later.

```bash
git clone https://github.com/brixdorf/habit-tracker.git
cd habit-tracker
npm install
```

This is an npm workspaces project (`client` and `server`), so `npm install` only needs to run once from the project root.

Set up your environment file:

```bash
cp .env.example .env
```

Generate a password hash for your chosen password:

```bash
node server/scripts/hash-password.js "your-password"
```

Paste the output into `AUTH_PASSWORD_HASH` in `.env`, set `AUTH_USERNAME` to whatever username you want, and set `SESSION_SECRET` to a long random string.

Run the app in development. This needs two terminals:

```bash
npm run dev:server   # starts the API on the port set in .env (defaults to 3000)
npm run dev:client   # starts the Vite dev server on port 5173, proxying API calls to the server
```

Open `http://localhost:5173`.

## Production build

```bash
npm run build   # builds the client into client/dist
npm start       # starts the server, which serves the built client and the API from one process
```

By default the server listens on port 3000, or whatever `PORT` is set to.

## Deployment

The app is built to run as a single Node process with no reverse proxy or process manager baked in. There is no Dockerfile and no PM2 config on purpose. It's meant to be deployed on a platform that builds and runs Node apps directly from a Git push, such as Dokploy, which handles the build (`npm install && npm run build`), the start command (`npm start`), routing, and TLS.

Required environment variables in production:

- `AUTH_USERNAME`
- `AUTH_PASSWORD_HASH`
- `SESSION_SECRET`
- `NODE_ENV=production`
- `PORT` (optional, defaults to 3000)

The server refuses to start in production if `SESSION_SECRET` is missing, rather than falling back to an insecure default.

The server also logs the resolved database path on startup (`Using SQLite database at ...`). Check your platform's runtime logs to confirm the exact path before configuring a volume mount, rather than guessing.

### Persistent storage

Data is stored in a SQLite database at `server/data/habit-tracker.sqlite`. The database runs in WAL mode, which means there are also `-wal` and `-shm` sidecar files alongside it holding not-yet-checkpointed writes.

If you're self-hosting this, mount `server/data` as a persistent volume, not just the `.sqlite` file on its own, or you risk losing recent writes on a container restart. The exact container path depends on how your platform structures the build. On a Railpack/Nixpacks-style builder (what Dokploy uses without a Dockerfile), the app root resolves to `/app`, so the path to mount is `/app/server/data`.

The JSON export/import feature is the primary backup mechanism for this app. There is no automated backup job.
