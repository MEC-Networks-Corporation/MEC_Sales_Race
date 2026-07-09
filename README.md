# Race to Quota — full application

A self-hosted sales race board: a public display for the office TV/monitor,
and a login-gated admin panel to manage the roster. Admin changes appear on
the display in real time (WebSocket push via Laravel Reverb — no polling,
no third-party service).

## Structure
```
sales-race-backend/    Laravel API — auth, data, photo storage, real-time broadcasting
sales-race-frontend/   React app — public display (/) and admin panel (/admin)
```

## Where to start
1. **Backend first:** open `sales-race-backend/BACKEND-SETUP.md` and follow it
   end to end (creates the Laravel project, installs Sanctum + Reverb, runs
   migrations, seeds your admin login).
2. **Then the frontend:** open `sales-race-frontend/README.md`.
3. **Then `DEPLOY.md`** (this folder) for running both on your own servers
   long-term, behind a reverse proxy.

## A note on how this was built
I wrote and syntax-checked every PHP file, and fully installed, built, and
lint-tested the React app — but I don't have a way to run Composer or a real
Laravel install in this environment, so the backend hasn't been exercised
end-to-end the way the frontend has. Please treat the Laravel half as
reviewed-but-not-yet-run, and do a real test pass (the smoke test at the
bottom of `BACKEND-SETUP.md` is a good first check) before this goes in front
of your team.
