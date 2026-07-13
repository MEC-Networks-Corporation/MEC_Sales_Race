---
name: servers
description: Start, stop, restart, or check the status of this project's local dev servers (Laravel API backend + Vite frontend). Use whenever the user asks to start/stop/restart "the servers" or "the app", or reports errors like "could not publish — check your connection" that usually mean a server isn't running.
---

# Sales Race dev servers

This project runs two local dev servers. There is no third "Reverb" websocket
server to manage here — `publish()` in the backend is written to succeed even
if Reverb isn't running (it just won't push a live update to the TV instantly;
the TV picks up the change on its next load). Don't start Reverb unless the
user explicitly asks for live/real-time broadcasting.

| Server | Directory | Command | Port |
|---|---|---|---|
| Backend (Laravel API) | `sales-race-backend/` | `php artisan serve` | 8000 |
| Frontend (Vite/React) | `sales-race-frontend/` | `npm run dev` | 5173 |

Read `$ARGUMENTS` (or the user's message) for which action they want:
**start**, **stop**, **restart**, or **status**. If unclear, default to
**status** first and ask before starting/stopping.

## Status

Check what's actually listening before doing anything else — don't trust
that a background process launched earlier is still alive.

```bash
lsof -iTCP -sTCP:LISTEN -P 2>/dev/null | grep -E ":8000|:5173"
```

Report plainly: which of the two are up, which are down.

## Start

Only start what status shows is missing. Launch each in the background so it
survives after this tool call returns, with output logged to a file (don't
use `run_in_background` truncation as your only record — the log file lets
you debug a crash-on-start).

```bash
cd /Users/Marc/Downloads/sales-race-project/sales-race-backend && (php artisan serve > /tmp/sales-race-backend.log 2>&1 &)
cd /Users/Marc/Downloads/sales-race-project/sales-race-frontend && (npm run dev > /tmp/sales-race-frontend.log 2>&1 &)
```

Wait a second, then re-run the status check to confirm both ports are now
listening. If a port didn't come up, `tail` its log file to see why (common
cause: the port is already in use by a stale process — see Stop below).

## Stop

```bash
pkill -f "php artisan serve"
pkill -f "node .*sales-race-frontend/node_modules/.bin/vite"
```

Re-run the status check afterward and confirm both ports are clear (no
output from the `lsof` command above means both are down).

## Restart

Stop, confirm both ports are clear, then Start.
