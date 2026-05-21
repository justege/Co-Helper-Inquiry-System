# Boilerplate

Full-stack boilerplate with:

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Auth | Firebase Authentication |
| Backend | Node.js + Express |
| API | REST (`/api/`) |
| Database | Supabase (PostgreSQL) |

---

## Project Structure

```
boilerplate/
├── backend/               # Node.js + Express REST API
│   ├── src/
│   │   ├── index.js       # Entry point
│   │   ├── db.js          # PostgreSQL pool (Supabase)
│   │   ├── middleware/
│   │   │   └── auth.js    # Firebase token verification
│   │   └── routes/
│   │       └── users.js   # GET/PUT /api/users/me, GET /api/users
│   ├── package.json
│   └── .env.example
└── frontend/              # React + TypeScript
    ├── src/
    │   ├── api/           # REST API helpers
    │   ├── components/    # AuthContext, SetupBanner
    │   ├── hooks/         # useAuth
    │   ├── lib/           # api.ts, firebase.ts
    │   ├── pages/         # Login, Register, Dashboard, Profile, Settings
    │   └── types/
    └── .env.example
```

---

## 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (PostgreSQL)
- A [Firebase](https://console.firebase.google.com) project with **Authentication** enabled

---

## 2. Backend Setup

```bash
cd backend

npm install

# Configure environment variables
cp .env.example .env
# → fill in DB_*, FIREBASE_CREDENTIALS_PATH
```

### Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key** → download the JSON file
3. Save it as `backend/firebase-service-account.json`  
   (or update `FIREBASE_CREDENTIALS_PATH` in `.env`)

### Start the backend

```bash
npm run dev
```

API runs at: **http://localhost:8000**  
Health check: **http://localhost:8000/health**

> The `users` table is created automatically on first boot if it doesn't exist.

---

## 3. Frontend Setup

```bash
cd frontend

npm install

# Configure environment variables
cp .env.example .env
# → fill in VITE_API_URL and all VITE_FIREBASE_* values
```

Firebase config values come from:  
Firebase Console → Project Settings → Your apps → Web app → Config

```bash
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 4. How Authentication Works

```
User (browser)
  │
  ├─ signs in via Firebase (email/password or Google)
  │   └─ Firebase returns an ID Token (JWT)
  │
  ├─ every API request attaches:  Authorization: Bearer <id-token>
  │
Express (backend)
  ├─ requireAuth middleware verifies the token with Firebase Admin SDK
  ├─ looks up or auto-creates a local user row (keyed by firebase_uid)
  └─ attaches uid + firebaseUser to req for all route handlers
```

---

## 5. API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/users/me` | Get current user profile |
| `PUT` | `/api/users/me` | Update username / avatarUrl |
| `GET` | `/api/users` | List all users |

All `/api/*` routes require a valid Firebase `Authorization: Bearer` header.

---

## 6. Adding Features

### New backend route

1. Create `backend/src/routes/myfeature.js`
2. Mount it in `backend/src/index.js`: `app.use("/api/myfeature", myFeatureRouter)`
3. Add corresponding API helpers in `frontend/src/api/myfeature.ts`

### New frontend page

1. Create `frontend/src/pages/MyPage.tsx`
2. Add a `<Route>` in `frontend/src/App.tsx`

---

## 7. Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (default: `8000`) |
| `DB_HOST` | Supabase DB host |
| `DB_PORT` | `5432` |
| `DB_NAME` | Supabase DB name (usually `postgres`) |
| `DB_USER` | Supabase DB user |
| `DB_PASSWORD` | Supabase DB password |
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase service account JSON |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Express backend URL |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
