# Qcuit Deployment Guide

## Overview

Qcuit deploys as a **single Vercel project** — both the React frontend and the
Flask API run on Vercel.

- **Frontend:** Vercel static build (`website/frontend` → `build/`), served from Vercel's CDN
- **Backend:** Vercel Python Serverless Function (`api/index.py` wraps the Flask app in `website/api`)
- **Database:** SQLite (local dev) / managed Postgres (production — Vercel Postgres or Neon)

All routing is defined in [`vercel.json`](../vercel.json):

| Request | Handled by |
|---------|-----------|
| `/api/*`, `/health` | Python serverless function (`api/index.py`) |
| `/static/*` and other build assets | Vercel CDN (static files) |
| Everything else | SPA fallback to `index.html` |

The frontend calls **relative** `/api/*` routes, so no backend URL needs to be
configured — same-origin requests are routed to the function by `vercel.json`.

---

## Deploying to Vercel

### Option A — Connect GitHub (recommended)

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Leave **Root Directory** as `.` (repo root). The build settings in
   `vercel.json` are picked up automatically — you do **not** need to set the
   Build Command or Output Directory in the dashboard.
3. Add the environment variables below.
4. Deploy. Every push to `main` auto-deploys.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Required | Purpose |
|----------|----------|---------|
| `SECRET_KEY` | yes | Flask session signing — generate a random value |
| `JWT_SECRET_KEY` | yes | JWT token signing — generate a random value |
| `DATABASE_URL` | only for auth/blog | Postgres connection string (see below) |
| `FLASK_ENV` | optional | Defaults to `production` in the function |

Generate secrets locally:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

> The quantum tools (simulate, optimize, transpile, estimate, statevector,
> explain, qnn, qec, pulse, noise) work **without** a database. Only the
> `auth` / `user` / `blog` routes require `DATABASE_URL`.

---

## Database (Postgres) for auth / blog

SQLite cannot be used in production — Vercel's filesystem is read-only and
ephemeral. Use a managed Postgres provider:

1. **Vercel Postgres:** Project → Storage → Create → Postgres. Vercel injects a
   `POSTGRES_URL` / `DATABASE_URL` automatically.
2. **Neon (or any Postgres):** create a database and copy the connection
   string into `DATABASE_URL`.

Notes:

- Use the provider's **pooled** connection string when available (Neon's
  `-pooler` host, or Vercel Postgres's pooled URL). The app uses SQLAlchemy
  `NullPool` so it never holds connections between serverless invocations.
- `postgres://` URLs are auto-rewritten to `postgresql://` in
  `website/api/config.py`.
- Tables are created automatically on the first cold start
  (`db.create_all()` in the application factory).

---

## Verify a deployment

```bash
# Health
curl -sS https://<your-app>.vercel.app/api/health

# Simulate a Bell state
curl -sS https://<your-app>.vercel.app/api/simulate \
  -X POST -H "Content-Type: application/json" \
  -d '{"numQubits":2,"numClassical":2,"gates":{"q0":{"gateType":"H","target":0,"timestep":0}},"multiQubitGates":[{"gateType":"CNOT","control":0,"target":1,"timestep":1}],"measurements":[],"noiseLevel":0}'
```

In the browser: open the site, go to `/visualizer`, build a circuit, and click
**Simulate** — it should call the same-origin `/api/simulate` function. Open the
**Circuit Explainer** — it calls `/api/explain` (deterministic, no external keys).

---

## Local Development

```bash
# Terminal 1: Backend from repo root
make backend                         # Flask on :5001

# Terminal 2: Frontend from repo root
make frontend                        # React on :3001, proxies /api to :5001

# Smoke check
curl -sS http://localhost:5001/health
```

For a quick check of the serverless entry point itself:

```bash
python3 -c "from api.index import app; print(app.test_client().get('/api/health').json)"
```

---

## Troubleshooting

### Build fails on Vercel
- Confirm `vercel.json` is at the repo root and **Root Directory** is `.`.
- The build runs `cd website/frontend && npm install && npm run build`.

### `/api/*` returns 404
- Ensure `vercel.json` rewrites are present (`/api/(.*)` → `/api/index`).
- The function lives at `api/index.py` and exposes a WSGI `app`.

### Function build exceeds size limit
- `vercel.json` scopes the bundle via `includeFiles: "website/{api,data}/**"`,
  and `.vercelignore` excludes `node_modules`, `.venv`, `library/`, `paper/`.
  Don't widen these without checking the 250 MB unzipped limit.

### Auth / blog routes return 500
- `DATABASE_URL` is not set (or unreachable). Add a Postgres URL — see above.

### Database tables missing
- They are created on the first request after a cold start. If a migration is
  needed, run `db.create_all()` within an app context against `DATABASE_URL`.
