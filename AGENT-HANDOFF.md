# SRlite / Roadside Radar — Agent Handoff

Use this file when opening this repo in Cursor. The user wants the agent to **push to GitHub** and help **deploy on Railway**.

---

## Repo target

| Item | Value |
|------|--------|
| **GitHub repo** | https://github.com/js91tech/SRlite |
| **Remote** | `origin` → `https://github.com/js91tech/SRlite.git` |
| **Default branch** | `main` |
| **Local path (user PC)** | `C:\Users\shipping.SHIPPING\Projects\roadside-radar` |

---

## What this project is

**Roadside Radar (SRlite)** — dispatch lead-fishing dashboard for a roadside/tow company that owns its own trucks.

- **Default territory:** 25-mile radius around Marietta, GA (zip 30060)
- **Later:** configurable zip + radius per territory

### Stack

```
roadside-radar/
├── client/     React + Vite + Leaflet (dispatcher UI)
├── server/     Express + SQLite + WebSocket + 511GA poller
├── package.json   npm workspaces root
├── railway.toml   Railway deploy config (Nixpacks)
├── nixpacks.toml
├── Dockerfile     (backup deploy path)
├── render.yaml    (alternative host)
└── DEPLOY-RAILWAY.md
```

### Key URLs (local dev)

| URL | Purpose |
|-----|---------|
| http://localhost:5173 | Dispatcher dashboard (dev) |
| http://localhost:3001 | API + production-style single server |
| http://localhost:3001/help | Driver self-report page |
| ws://localhost:3001/ws | Real-time lead alerts |

### Production (single server)

`npm run build` builds client → `client/dist`, server → `server/dist`.  
`npm start` serves API + dashboard + `/help` from one Node process on `PORT`.

---

## What’s already built (MVP)

- [x] Territory map (Marietta 25mi circle)
- [x] Lead scoring engine (source weight + freshness + corridor + truck proximity)
- [x] Alert tray with Fish / Jobs modes
- [x] One-click assign nearest truck to lead
- [x] Owned fleet truck map (3 demo units)
- [x] Demo leads seeded (Honk offer, Reddit-style social, 511 incident)
- [x] Driver self-report (`/help` + dashboard “+ Report” button)
- [x] Territory settings (zip + radius; geocodes zip)
- [x] 511GA poller (when `GA511_API_KEY` env var set)
- [x] WebSocket real-time alerts
- [x] SQLite database at `server/data/roadside-radar.db`

### Not yet built

- [ ] Honk / Urgently live API integrations (manual/demo only)
- [ ] Reddit/X social keyword listener
- [ ] Partner referral portal
- [ ] Driver mobile app
- [ ] PostgreSQL / PostGIS (SQLite is fine for MVP)

---

## Agent task #1 — Push to GitHub

Run from repo root:

```bash
git status
git remote -v
# Expect: origin → https://github.com/js91tech/SRlite.git

git add -A
git commit -m "SRlite MVP: dispatch lead radar for Marietta GA"
git branch -M main
git push -u origin main
```

If remote is missing:

```bash
git remote add origin https://github.com/js91tech/SRlite.git
git push -u origin main
```

If push rejected and remote repo is empty or user approves overwrite:

```bash
git push -u origin main --force
```

Use `gh` if available:

```bash
gh auth status
gh repo view js91tech/SRlite
git push -u origin main
```

**Do not commit:** `.env`, `*.db`, `node_modules/`

---

## Agent task #2 — Verify build locally (optional)

```bash
npm install
npm run build
npm start
# curl http://localhost:3001/api/health
```

---

## Agent task #3 — Railway deploy

User hosts on **Railway** (not Vercel/Netlify — needs long-running Node + WebSocket + poller).

### Railway settings

| Setting | Value |
|---------|--------|
| **Builder** | Nixpacks (see `railway.toml`) |
| **Build command** | `npm install && npm run build` (auto via nixpacks.toml) |
| **Start command** | `npm start` |
| **Health check** | `/api/health` |

### Required volume (SQLite persistence)

| Mount path |
|------------|
| `/app/server/data` |

Without this volume, leads/trucks reset on every redeploy.

### Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Auto | Set by Railway — do not override |
| `GA511_API_KEY` | No | Live Georgia traffic incidents from 511ga.org |

### After deploy

1. Generate public domain in Railway → Networking
2. Verify:
   - `https://YOUR-URL/` — dashboard
   - `https://YOUR-URL/help` — driver form
   - `https://YOUR-URL/api/health` — `{"ok":true,...}`

Full step-by-step: see **DEPLOY-RAILWAY.md**

---

## API reference (quick)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/territories` | List territories |
| GET | `/api/territories/:id` | Get territory |
| PATCH | `/api/territories/:id` | Update zip/radius |
| GET | `/api/leads?mode=fish\|jobs` | Scored leads |
| POST | `/api/leads` | Create lead |
| POST | `/api/leads/:id/assign` | Assign truck |
| PATCH | `/api/leads/:id/status` | Update status |
| GET | `/api/trucks` | Fleet units |
| GET | `/api/quotes` | Quote templates |

WebSocket: `/ws` — events `lead:new`, `lead:updated`, `leads:refresh`

---

## Lead sources (priority for future work)

1. **P0** — Self-report `/help`, inbound calls, owned fleet GPS
2. **P1** — Honk, Urgently, motor club email
3. **P2** — Cobb County / GSP police rotation (manual workflow)
4. **P3** — 511GA API, social listening (Reddit r/Atlanta), partner referrals

---

## User context

- **Market:** Marietta, GA + 25 mile radius (I-75, I-285, I-575 corridors)
- **Dispatch model:** Company owns its own trucks (not a broker-only)
- **Primary goal:** Find leads (fishing) > convert leads
- **GitHub account:** `js91tech`
- **Preferred host:** Railway

---

## Prompt to paste when repo is connected

```
Read AGENT-HANDOFF.md and DEPLOY-RAILWAY.md.

1. Push all code to https://github.com/js91tech/SRlite (main branch).
2. Confirm push succeeded — list files on GitHub.
3. Walk me through Railway deploy or fix any build errors.
4. Do not commit .env or .db files.
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `better-sqlite3` build fail | Ensure `nixpacks.toml` includes `python3`; or use `Dockerfile` (Debian-based) |
| Blank page in prod | `npm run build` must produce `client/dist`; server serves it from `server/src/index.ts` |
| DB resets on redeploy | Add Railway volume at `/app/server/data` |
| 511 poller silent | Set `GA511_API_KEY`; get key at https://511ga.org/developers/doc |
| WebSocket fails | Must be same origin in prod; client uses `window.location.host` |
