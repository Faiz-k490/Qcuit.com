# Qcuit Deployment Guide

## Overview

- **Backend:** Heroku (Flask API)
- **Frontend:** Vercel (React build configured in dashboard)
- **Database:** SQLite (dev) / Heroku Postgres (production)

---

## Backend — Heroku

### Prerequisites

- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- Heroku account with an app created

### Setup

```bash
# Login
heroku login

# Set remote (replace YOUR-APP with your Heroku app name)
heroku git:remote -a YOUR-APP

# Set environment variables
heroku config:set SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
heroku config:set JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
heroku config:set FLASK_ENV=production

# Add Postgres addon (optional — replaces SQLite)
heroku addons:create heroku-postgresql:essential-0

# Deploy
git push heroku main

# Initialize database tables
heroku run "PYTHONPATH=website python3 -c \"from api import create_app; app = create_app(); ctx = app.app_context(); ctx.push(); from api.models import db; db.create_all(); print('DB initialized')\""
```

### Procfile

The root `Procfile` runs:
```
web: PYTHONPATH=website gunicorn api.index:app
```

This sets `PYTHONPATH=website` so all `api.xxx` imports resolve to `website/api/`.

### Verify

```bash
heroku logs --tail
curl https://YOUR-APP.herokuapp.com/api/simulate \
  -X POST -H "Content-Type: application/json" \
  -d '{"numQubits":2,"numClassical":2,"gates":{"q_0-0":{"id":"h","gateType":"H","qubit":0,"timestep":0}},"multiQubitGates":[],"measurements":[],"noiseLevel":0}'
```

---

## Frontend — Vercel

### Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) or connect via GitHub

### Setup

1. Connect your GitHub repo to Vercel
2. Set the following in Vercel project settings:
   - **Build Command:** `cd website/frontend && npm install && npm run build`
   - **Output Directory:** `website/frontend/build`
   - **Root Directory:** `.` (repo root)

3. Ensure the Vercel app's proxy settings are active for your backend, or configure rewrites within Vercel's Edge config.

### Deploy

```bash
# Via CLI
vercel --prod

# Or push to GitHub — Vercel auto-deploys from main branch
```

### Verify

- Visit `https://your-vercel-app.vercel.app`
- Navigate to `/visualizer` — the circuit canvas should load
- Click Simulate — should connect to Heroku backend
- Open the Circuit Explainer — should call `/api/explain` without external API keys

---

## Environment Variables Reference

| Variable | Where | Purpose |
|----------|-------|---------|
| `SECRET_KEY` | Heroku | Flask session signing |
| `JWT_SECRET_KEY` | Heroku | JWT token signing |
| `FLASK_ENV` | Heroku | Set to `production` |
| `DATABASE_URL` | Heroku (auto) | Postgres connection string |

> The frontend does NOT need any environment variables — all API calls are proxied through Vercel rewrites.

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

---

## Troubleshooting

### "Application Error" on Heroku
```bash
heroku logs --tail   # Check for Python import errors
```
Common fix: ensure `PYTHONPATH=website` is in Procfile.

### API calls fail on Vercel
- Check that Vercel is proxies the `/api/*` endpoints to your Heroku app URLs
- Check Heroku logs for 500 errors

### Visualizer cannot reach backend
- Confirm `make backend` is running.
- Confirm `curl -sS http://localhost:5001/health` returns `{"status":"ok",...}`.
- Confirm the frontend was started from `website/frontend` or via `make frontend` so the package proxy points `/api/*` to `localhost:5001`.
- Re-run `PYTHONPATH=. python3 -m pytest api/tests/test_visualizer_connectivity.py` from `website/`.

### Database tables missing
```bash
heroku run "PYTHONPATH=website python3 -c \"from api import create_app; app = create_app(); ctx = app.app_context(); ctx.push(); from api.models import db; db.create_all()\""
```
