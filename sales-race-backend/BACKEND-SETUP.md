# Backend setup — Laravel + Reverb (real-time), self-hosted

These files are meant to drop into a fresh Laravel project. I couldn't run
`composer` in the sandbox I built this in (no internet access to Packagist
there), so I wrote everything by hand and syntax-checked every PHP file with
`php -l` — but you'll want to `composer install` and smoke-test this on your
end before it touches production.

## 1. Create the Laravel project
```bash
composer create-project laravel/laravel sales-race-backend
cd sales-race-backend
```

## 2. Install Sanctum (admin login) and Reverb (real-time)
```bash
composer require laravel/sanctum
php artisan install:api
# This scaffolds routes/api.php and Sanctum's migrations — you'll overwrite
# routes/api.php with the one provided here in step 4.

composer require laravel/reverb
php artisan install:broadcasting
# Choose "Yes" to install Reverb when prompted. This edits your .env with
# REVERB_APP_ID / REVERB_APP_KEY / REVERB_APP_SECRET automatically — don't
# overwrite those with the placeholder values in env-additions.txt.
```

## 3. Copy in these files
Copy each file from this package into the matching path in your new Laravel
project (same relative path):

```
database/migrations/2026_07_09_000001_create_team_members_table.php
app/Models/TeamMember.php
app/Events/TeamUpdated.php
app/Http/Controllers/Api/AuthController.php
app/Http/Controllers/Api/TeamMemberController.php
database/seeders/DatabaseSeeder.php   → replace the generated one
config/cors.php                       → replace the generated one
```

`routes/api.php` — merge (don't blindly overwrite): keep the Sanctum-related
lines `install:api` added, and add the routes from the `routes/api.php` in
this package alongside them.

## 4. Update your `.env`
Open `env-additions.txt` from this package and add those keys to your `.env`
— **except** the five `REVERB_*` values, which `install:broadcasting` already
filled in for you in step 2. Set a real `ADMIN_PASSWORD` before the next step.

Also make sure your normal database settings (`DB_CONNECTION`, etc.) are set
— SQLite is the fastest way to get running (`DB_CONNECTION=sqlite`, then
`touch database/database.sqlite`), or point it at MySQL/Postgres if that's
what your servers already run.

## 5. Migrate, seed, and link storage
```bash
php artisan migrate:fresh --seed
php artisan storage:link
```
This creates the `team_members` table, creates your admin login from
`ADMIN_EMAIL` / `ADMIN_PASSWORD`, and makes uploaded photos publicly
reachable at `/storage/team-photos/...`.

## 6. Run it
Two processes need to stay running:
```bash
php artisan serve          # the API, default http://localhost:8000
php artisan reverb:start   # the WebSocket server, default port 8080
```
No queue worker is needed — broadcasts fire synchronously (`ShouldBroadcastNow`).

For actual deployment on your servers (not just local testing), run both of
these under a process manager (systemd services or `pm2`/`supervisor`) so
they restart on crash/reboot, and put Nginx or Apache in front as a reverse
proxy — including proxying `/app` (Reverb's WebSocket path) with the
`Upgrade`/`Connection` headers passed through. Happy to write that Nginx
config too if useful once you're ready for that step.

## 7. Quick smoke test
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mecnetworks.com","password":"YOUR_PASSWORD"}'
# → { "token": "...", "user": {...} }

curl http://localhost:8000/api/team
# → { "team": [] }
```
