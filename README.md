# Roadside Radar

Dispatch lead-fishing dashboard for roadside assistance companies. Default territory: **25-mile radius around Marietta, GA (30060)**.

## Features

- **Map dashboard** with territory circle, lead pins (scored), and owned truck locations
- **Alert tray** sorted by lead score with Fish / Jobs modes
- **One-click assign** nearest available truck to a lead
- **511GA poller** for live Georgia traffic incidents (optional API key)
- **Demo leads** seeded on first run (Honk offer, Reddit-style social, 511 incident)
- **Driver self-report** button to simulate branded help-link intake
- **Territory settings** — change zip + radius to retarget your zone
- **WebSocket** real-time lead alerts

## Quick start

```bash
cd roadside-radar
npm install
npm run dev
```

- **Dashboard:** http://localhost:5173
- **API:** http://localhost:3001/api/health

### Optional: live 511GA incidents

1. Register at [511ga.org/developers/doc](https://511ga.org/developers/doc)
2. Copy `.env.example` to `.env` in the project root
3. Set `GA511_API_KEY=your_key`

Without a key, the app runs with demo seed data only.

## Project structure

```
roadside-radar/
├── client/          React + Vite + Leaflet dispatcher UI
├── server/          Express API + SQLite + 511 poller + WebSocket
├── package.json     npm workspaces root
└── .env.example
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/territories` | List territories |
| GET | `/api/territories/:id` | Get territory |
| PATCH | `/api/territories/:id` | Update zip/radius (geocodes zip) |
| GET | `/api/leads?mode=fish\|jobs` | List scored leads |
| POST | `/api/leads` | Create/upsert lead |
| POST | `/api/leads/:id/assign` | Assign truck + create job |
| PATCH | `/api/leads/:id/status` | Update lead status |
| GET | `/api/trucks` | Fleet units |
| GET | `/api/quotes` | Quote templates |

WebSocket: `ws://localhost:3001/ws` — events `lead:new`, `lead:updated`, `leads:refresh`

## Hosting (where to run it)

**GitHub only stores the code** — you still need a host to run the app 24/7 (API, WebSocket, 511 poller, SQLite).

### Recommended: Railway or Render (easiest)

| Host | Why | Cost |
|------|-----|------|
| **[Railway](https://railway.app)** | Deploy from GitHub, persistent disk for SQLite, WebSockets work | ~$5/mo+ |
| **[Render](https://render.com)** | Similar; `render.yaml` included in repo | Free tier limited; paid ~$7/mo |

Steps (either platform):
1. Connect GitHub repo `js91tech/SRlite`
2. Set env var `GA511_API_KEY` (optional)
3. Deploy — build runs `npm install && npm run build`, start runs `npm start`
4. Use the provided URL (e.g. `https://srlite.onrender.com`)

### Also works

- **Fly.io** — use included `Dockerfile`, attach a volume at `/app/server/data`
- **DigitalOcean Droplet / VPS** — full control; `docker compose up` or `npm start` behind nginx
- **Not recommended:** Vercel/Netlify alone — this app needs a **long-running Node server** + WebSockets + background poller, not pure static hosting

### Production URLs

| Path | Purpose |
|------|---------|
| `/` | Dispatcher dashboard |
| `/help` | Driver self-report page |
| `/api/health` | Health check |
| `/ws` | WebSocket alerts |

## Next steps

- Honk / Urgently marketplace API integrations
- Reddit/X keyword listener service
- Partner referral portal
- Driver mobile app
- PostgreSQL + PostGIS for production scale
