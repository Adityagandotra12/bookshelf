# Bookshelf: Deployment Guide (Vercel + Render + TiDB Cloud)

This repo is a **single repository** with:
- **Frontend**: React + Vite at project **root** (deploy to **Vercel**).
- **Backend**: Node/Express in **`/server`** (deploy to **Render** Web Service).
- **Database**: MySQL-compatible (e.g. **TiDB Cloud Serverless**).

---

## 1. TiDB Cloud (Database)

### Get connection details

1. Sign up at [TiDB Cloud](https://tidbcloud.com) (free tier).
2. Create a **Serverless** cluster.
3. In the cluster dashboard, open **Connect** / **Connection Info**.
4. Note:
   - **Host** → `DB_HOST` (e.g. `gateway01.xxx.prod.aws.tidbcloud.com`)
   - **Port** → `DB_PORT` (TiDB Serverless often uses **4000**; use the value shown)
   - **User** → `DB_USER`
   - **Password** → `DB_PASSWORD`
   - **Database** → create one or use default → `DB_NAME`
5. **SSL**: TiDB Cloud requires TLS. Set **`DB_SSL=true`** in your backend env.

### Env vars for backend (from TiDB)

| Variable      | Example / note                          |
|---------------|-----------------------------------------|
| `DB_HOST`     | From TiDB “Host”                        |
| `DB_PORT`     | **4000** (TiDB Serverless) or 3306     |
| `DB_USER`     | From TiDB                               |
| `DB_PASSWORD` | From TiDB                               |
| `DB_NAME`     | Your database name                      |
| `DB_SSL`      | **true** (required for TiDB Cloud)      |

### Run schema (first time)

After the backend can connect, run the schema once. Options:

- **Option A**: From your machine (with MySQL client):
  ```bash
  mysql -h "<DB_HOST>" -P 4000 -u "<DB_USER>" -p "<DB_NAME>" < server/schema.sql
  ```
  (TiDB Cloud may provide a “Connect via standard connection” string.)

- **Option B**: Use the backend’s existing behavior: on first start it runs `initDb()`, which applies `server/schema.sql` if the DB is empty. So deploying the backend with correct DB env vars and restarting once is often enough.

---

## 2. Render (Backend)

### Service setup

1. [Render](https://render.com) → **New** → **Web Service**.
2. Connect your repo. **Root Directory**: leave empty (we’ll set it to `server` in the next step).
3. **Root Directory**: **`server`** (so Render builds and runs only the backend).
4. **Runtime**: **Node**.
5. **Build Command**:  
   `npm install && npm run build`
6. **Start Command**:  
   `npm start`
7. **Instance Type**: **Free** (if available).

### Env vars (Render dashboard → Environment)

Set these in Render. Replace placeholders with your real values.

| Variable        | Value / example |
|-----------------|-----------------|
| `NODE_ENV`      | `production` |
| `PORT`          | Leave **empty** (Render sets it automatically; app uses `process.env.PORT`) |
| `JWT_SECRET`    | Long random string (e.g. 32+ chars) |
| `JWT_EXPIRES_IN` | `7d` |
| `DB_HOST`       | From TiDB Cloud |
| `DB_PORT`       | `4000` (or value from TiDB) |
| `DB_USER`       | From TiDB |
| `DB_PASSWORD`   | From TiDB |
| `DB_NAME`       | Your DB name |
| `DB_SSL`        | `true` |
| `FRONTEND_URL`  | Your Vercel URL, e.g. `https://your-bookshelf.vercel.app` (no trailing slash) |

Optional (password reset email):

- `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_FROM_NAME`
- `BACKEND_URL` = your Render URL (for reset links in emails)

### Summary: Render settings

| Setting          | Value |
|------------------|--------|
| Root Directory   | `server` |
| Build Command    | `npm install && npm run build` |
| Start Command    | `npm start` |
| Health check path (optional) | `/health` |

After deploy, note the **backend URL** (e.g. `https://bookshelf-xxxx.onrender.com`). You’ll use it in Vercel.

---

## 3. Vercel (Frontend)

### Project setup

1. [Vercel](https://vercel.com) → **Add New** → **Project** → import your repo.
2. **Root Directory**: leave as **`.`** (project root).
3. **Framework Preset**: **Vite** (or leave auto).
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. **Install Command**: `npm install` (default).

### Env vars (Vercel → Settings → Environment Variables)

| Name            | Value |
|-----------------|--------|
| `VITE_API_URL`  | Your **Render backend URL**, e.g. `https://bookshelf-xxxx.onrender.com` (no trailing slash, no `/api`) |

Redeploy after adding env vars so the build picks them up.

### Summary: Vercel settings

| Setting          | Value |
|------------------|--------|
| Root Directory   | `.` (repo root) |
| Build Command    | `npm run build` |
| Output Directory | `dist` |

---

## 4. Final environment variable lists

### Render (backend)

```
NODE_ENV=production
JWT_SECRET=<generate-a-long-secret>
JWT_EXPIRES_IN=7d
DB_HOST=<tidb-host>
DB_PORT=4000
DB_USER=<tidb-user>
DB_PASSWORD=<tidb-password>
DB_NAME=<your-db-name>
DB_SSL=true
FRONTEND_URL=https://your-bookshelf.vercel.app
```

(Do **not** set `PORT` on Render; Render sets it.)

### Vercel (frontend)

```
VITE_API_URL=https://bookshelf-xxxx.onrender.com
```

---

## 5. Repo structure (reference)

```
bookshelf/
├── package.json          # Frontend (Vite)
├── vite.config.ts
├── src/
│   ├── api/client.ts     # Uses VITE_API_URL or /api
│   └── ...
├── server/
│   ├── package.json      # Backend (Express)
│   ├── src/
│   │   ├── index.ts      # Entry; listens on process.env.PORT; GET /health
│   │   ├── config.ts     # Reads PORT, DB_*, FRONTEND_URL, etc.
│   │   ├── db.ts         # mysql2 pool; SSL when DB_SSL=true
│   │   └── ...
│   └── schema.sql
├── .env.example          # Frontend: VITE_API_URL
└── DEPLOYMENT.md         # This file
```

---

## 6. Common issues

| Issue | Fix |
|-------|-----|
| **CORS errors** | Set `FRONTEND_URL` on Render to the **exact** Vercel URL (same scheme and domain). Redeploy backend. |
| **Backend not listening** | Backend uses `process.env.PORT`; do not set PORT on Render so Render can inject it. |
| **DB connection fails** | Set `DB_SSL=true` for TiDB Cloud. Check `DB_HOST`, `DB_PORT` (e.g. 4000), user/password. |
| **Frontend calls wrong API** | In Vercel set `VITE_API_URL` to the full Render URL (no trailing slash). Redeploy frontend. |
| **502 / health check fails** | Ensure Start Command is `npm start` and the app listens on `process.env.PORT`. Health: `GET /health` → `{ "ok": true }`. |

---

## 7. Run locally after changes

**Backend**

```bash
cd server
cp .env.example .env
# Edit .env: DB_*, JWT_SECRET, FRONTEND_URL=http://localhost:5173
npm install
npm run dev
# or: npm run build && npm start
```

**Frontend**

```bash
# From repo root
npm install
npm run dev
```

Leave `VITE_API_URL` unset in `.env` so the app uses the Vite proxy (`/api` → backend). Backend runs at **http://localhost:3001**; frontend at **http://localhost:5173**.
