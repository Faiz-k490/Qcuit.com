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
heroku config:set GEMINI_API_KEY=your-gemini-api-key
heroku config:set FLASK_ENV=production

# Add Postgres addon (optional — replaces SQLite)
heroku addons:create heroku-postgresql:essential-0

# Deploy
git push heroku main

# Initialize database tables
heroku run "PYTHONPATH=studio python3 -c \"from api import create_app; app = create_app(); ctx = app.app_context(); ctx.push(); from api.models import db; db.create_all(); print('DB initialized')\""
```

### Procfile

The root `Procfile` runs:
```
web: PYTHONPATH=studio gunicorn api.index:app
```

This sets `PYTHONPATH=studio` so all `api.xxx` imports resolve to `studio/api/`.

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
   - **Build Command:** `cd studio/frontend && npm install && npm run build`
   - **Output Directory:** `studio/frontend/build`
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
- Navigate to `/simulator` — Studio should load
- Click Simulate — should connect to Heroku backend
- Click Tutor — should work with Gemini API (key is on Heroku)

---

## Environment Variables Reference

| Variable | Where | Purpose |
|----------|-------|---------|
| `SECRET_KEY` | Heroku | Flask session signing |
| `JWT_SECRET_KEY` | Heroku | JWT token signing |
| `GEMINI_API_KEY` | Heroku | Google Gemini AI Tutor |
| `FLASK_ENV` | Heroku | Set to `production` |
| `DATABASE_URL` | Heroku (auto) | Postgres connection string |

> The frontend does NOT need any environment variables — all API calls are proxied through Vercel rewrites.

---

## Local Development

```bash
# Terminal 1: Backend
cd studio
PYTHONPATH=. python3 api/index.py    # Flask on :5001

# Terminal 2: Frontend
cd studio/frontend
npm start                             # React on :3000 (proxies to :5001)
```

---

## Troubleshooting

### "Application Error" on Heroku
```bash
heroku logs --tail   # Check for Python import errors
```
Common fix: ensure `PYTHONPATH=studio` is in Procfile.

### API calls fail on Vercel
- Check that Vercel is proxies the `/api/*` endpoints to your Heroku app URLs
- Check Heroku logs for 500 errors

### Gemini Tutor returns 503
- Set `GEMINI_API_KEY` on Heroku: `heroku config:set GEMINI_API_KEY=xxx`
- Verify: `heroku config:get GEMINI_API_KEY`

### Database tables missing
```bash
heroku run "PYTHONPATH=studio python3 -c \"from api import create_app; app = create_app(); ctx = app.app_context(); ctx.push(); from api.models import db; db.create_all()\""
```
