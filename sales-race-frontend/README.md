# Race to Quota — frontend (React + Vite)

Two routes:
- `/` — the public race display (read-only). Point the office TV/monitor here.
- `/admin` — login-gated editor. Add/edit/remove teammates, upload photos,
  import/export CSV. Every change here appears on `/` in real time.

## Setup
```bash
npm install
cp .env.example .env   # then fill in VITE_REVERB_APP_KEY from the backend's .env
npm run dev             # local development, http://localhost:5173
```

## Build for production
```bash
npm run build            # outputs to dist/
```
Serve `dist/` with any static file host (Nginx, Apache, or even Laravel's own
`public/` folder if you want one server for everything — see the root
`DEPLOY.md` for that option).

## Requirements
The backend (Laravel + Reverb) must be running and reachable at the URL in
`VITE_API_URL`, with matching Reverb credentials in `VITE_REVERB_*`. See
`../sales-race-backend/BACKEND-SETUP.md`.
