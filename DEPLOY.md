# Deploying on Railway

## Root Directory setting (important)

**Your Railway service uses Root Directory `/backend`.** The repo is configured for that:

- `railway.toml` → `dockerfilePath = "backend/Dockerfile"`
- That Dockerfile clones the repo to build the Vite frontend, then runs Express.

| Root Directory | `dockerfilePath` | Result |
|---|---|---|
| **`/backend`** (your setup) | `backend/Dockerfile` | Works |
| **empty** | `Dockerfile` (change in `railway.toml`) | Monorepo build, no git clone |

The build fails with `"/frontend": not found` when Root Directory is `/backend` but Railway still uses the **root** `/Dockerfile`.

## Required Railway variables

Build-time (for Vite / AI chat):

- `VITE_GEMINI_API_KEY`
- `VITE_FIREBASE_*` (if used)
- `VITE_API_URL` (production API URL)

Runtime (backend):

- `DATABASE_URL` or Supabase vars your backend expects
- Firebase / JWT secrets as configured in `backend/.env.example`

## Health check

- Path: `/health`
- Port: `8000`

## Still failing?

1. **Settings → Source → Root Directory** — use empty **or** `/backend` (not both behaviors mixed).
2. **Settings → Build** — builder should be **Dockerfile** (from `railway.toml`).
3. Redeploy after changing Root Directory (clears bad cache layers).
