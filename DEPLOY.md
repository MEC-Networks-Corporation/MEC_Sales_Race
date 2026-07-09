# Running this on your own servers

Three things need to run continuously:
1. **Laravel API** (`php artisan serve` isn't meant for production — use PHP-FPM + Nginx/Apache instead)
2. **Reverb** (the WebSocket server for real-time updates)
3. **The built React app** (static files — served by Nginx, or by Laravel itself)

## Simplest option: one server, one domain
Put the React build inside Laravel's `public/` folder and let Laravel serve
everything — one PHP process, one web server config, one domain. This is the
lowest-maintenance option for an internal tool.

```bash
cd sales-race-frontend
npm run build
cp -r dist/* ../sales-race-backend/public/
```
Re-run this after every frontend change (or wire it into a small deploy
script — happy to write one if useful).

## Nginx config (one server, one domain)
```nginx
server {
    listen 80;
    server_name race.mecnetworks.internal;
    root /var/www/sales-race-backend/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Reverb — WebSocket upgrade
    location /app {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```
With this setup, your frontend `.env` should point `VITE_API_URL` at
`https://race.mecnetworks.internal/api` and Reverb at the same host, port 443
(behind TLS) or 80.

## Keeping Reverb (and the queue, if you add one later) running
Use systemd so it survives reboots and restarts on crash:

```ini
# /etc/systemd/system/race-reverb.service
[Unit]
Description=Race to Quota - Reverb WebSocket server
After=network.target

[Service]
WorkingDirectory=/var/www/sales-race-backend
ExecStart=/usr/bin/php artisan reverb:start
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now race-reverb
```

## HTTPS
If this is reachable outside your LAN, put it behind TLS (Certbot/Let's
Encrypt is the easiest free option) — the admin login sends a password over
the wire, so it shouldn't run on plain HTTP outside a trusted internal network.

## Backups
Everything that matters lives in two places:
- The database (`team_members`, `users` tables)
- `storage/app/public/team-photos/` (uploaded photos)

Back up both. If you're using SQLite, that's a single `database.sqlite`
file — trivial to include in whatever backup routine you already run.

## Multiple admins
Anyone you want to be able to edit the roster needs a row in the `users`
table. Re-run the seeder with different `.env` values, or just add rows
directly — there's no separate "admin" role/flag in this build, every user
can edit. If you want tiered access later (e.g. some people can only view,
not edit), that's a small addition — just ask.
