# Deploy SRlite to Railway — step by step

## Before you start

- Code pushed to GitHub: https://github.com/js91tech/SRlite
- Railway account: https://railway.app
- (Optional) 511GA API key from https://511ga.org/developers/doc

---

## Step 1 — Push latest code to GitHub

In PowerShell on your PC:

```powershell
cd C:\Users\shipping.SHIPPING\Projects\roadside-radar
git add -A
git commit -m "Railway deploy config"   # skip if nothing to commit
git push origin main
```

If you haven't pushed yet, run `.\push-to-github.ps1` first.

---

## Step 2 — Create a Railway project

1. Open **https://railway.app** and sign in (GitHub login is easiest).
2. Click **New Project**.
3. Choose **Deploy from GitHub repo**.
4. If asked, **authorize Railway** to access your GitHub account.
5. Select **`js91tech/SRlite`**.
6. Railway creates a service and starts the first deploy automatically.

---

## Step 3 — Add a persistent volume (important)

Without this, your SQLite database resets on every redeploy.

1. Click your **service** (the SRlite box in the project).
2. Open the **Volumes** tab (or **Settings → Volumes**).
3. Click **Add Volume**.
4. Set **Mount path** to:

   ```
   /app/server/data
   ```

5. Save. Railway may redeploy after adding the volume.

---

## Step 4 — Set environment variables

1. Click your service → **Variables** tab.
2. Add:

   | Variable | Value | Required |
   |----------|-------|----------|
   | `NODE_ENV` | `production` | Yes |
   | `GA511_API_KEY` | your 511GA key | No (demo data works without it) |

3. Railway automatically sets **`PORT`** — do not override it.

---

## Step 5 — Generate a public URL

1. Click your service → **Settings**.
2. Find **Networking** → **Public Networking**.
3. Click **Generate Domain**.
4. You'll get a URL like:

   ```
   https://srlite-production-xxxx.up.railway.app
   ```

---

## Step 6 — Verify the deploy

Open these in your browser:

| URL | Expected |
|-----|----------|
| `https://YOUR-DOMAIN.up.railway.app/` | Dispatcher dashboard with map |
| `https://YOUR-DOMAIN.up.railway.app/help` | Driver help form |
| `https://YOUR-DOMAIN.up.railway.app/api/health` | `{"ok":true,...}` |

If the build failed, open **Deployments** → latest deploy → **View logs**.

Common fixes:
- **Build error `better-sqlite3`**: redeploy after latest `nixpacks.toml` is pushed.
- **Blank page**: check build logs — `npm run build` must complete.
- **502 / not listening**: ensure start command is `npm start` (set in `railway.toml`).

---

## Step 7 — (Optional) Custom domain

1. Service → **Settings** → **Networking** → **Custom Domain**.
2. Add e.g. `dispatch.yourcompany.com`.
3. Add the CNAME record Railway shows at your DNS provider.

---

## Step 8 — Auto-deploy on push

Railway redeploys automatically when you push to `main` on GitHub. No extra setup needed if the repo is connected.

---

## Quick reference

| What | Where |
|------|--------|
| Code | GitHub `js91tech/SRlite` |
| Runs on | Railway |
| Dashboard | `https://YOUR-RAILWAY-URL/` |
| Driver help link | `https://YOUR-RAILWAY-URL/help` |
| Database file | `/app/server/data/roadside-radar.db` (on volume) |

---

## Costs

Railway charges by usage. A small app like this is typically **~$5/month** on the Hobby plan. Check https://railway.app/pricing.
