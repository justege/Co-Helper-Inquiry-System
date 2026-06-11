# Deploying on Railway

## Root Directory setting (important)

| Root Directory | Dockerfile used | Result |
|---|---|---|
| **empty** (recommended) | `/Dockerfile` | Monorepo build — frontend + backend in one image |
| **`/backend`** | `/backend/Dockerfile` | Backend context — clones repo to build frontend |

Both work. The build fails if Root Directory is `/backend` but Railway uses the **root** `/Dockerfile` (looks for `frontend/` in context and errors).

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
