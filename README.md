# 🎓 Basirhat College Updates Bot

A production-ready Telegram bot for **Basirhat College** ([@basirhatcollege_updates_bot](https://t.me/basirhatcollege_updates_bot)) that keeps students and staff updated with notices, class routines, results, syllabus, study materials, and important links — all with a full-featured admin panel for broadcasting and content management.

---

## ✨ Features

**For Students/Users**
- `/start`, `/help`, `/about`, `/contact`
- `/notices`, `/latest`, `/search <keyword>`
- `/routine`, `/results`, `/syllabus`, `/groups`, `/website`
- Clean inline-keyboard main menu

**Admin Panel** (restricted to `ADMIN_IDS`)
- Broadcast text / photo / PDF / video to all users, with live progress and retry-failed
- Schedule broadcasts for a future date/time
- Create / edit / delete / pin notices
- Upload class routines, study materials, results, syllabus
- Manage WhatsApp/website links
- Statistics dashboard (total/active/new users, notices, broadcasts)
- One-click database backup & CSV user export
- Maintenance mode toggle
- Remote restart (via PM2)

**Engineering**
- SQLite by default, designed for a drop-in MySQL adapter later
- Winston logging with daily rotation (error / combined / activity logs)
- Helmet, CORS, compression, HTTP + per-user rate limiting
- Parameterized SQL everywhere (no injection surface)
- Global error handling, graceful shutdown, PM2-ready

---

## 📁 Project Structure

```
project/
├── src/
│   ├── bot.js            # Telegram bot instance (polling/webhook)
│   ├── server.js         # Express entrypoint, health check, webhook route
│   ├── config.js         # Environment config loader
│   ├── database.js       # SQLite adapter (swap for MySQL later)
│   ├── logger.js         # Winston logger
│   ├── middleware/       # Rate limiting, admin auth, maintenance mode, error wrapper
│   ├── commands/         # /start /help /notices etc.
│   ├── handlers/         # message + callback_query routers
│   ├── admin/            # Broadcast, notices, uploads, links, stats, backup, maintenance
│   ├── utils/            # Keyboards, markdown escaping, validators, file helpers, sessions
│   └── services/         # userService, noticeService, fileService, broadcastService, backupService, schedulerService
├── database/
│   └── schema.sql        # Full SQL schema (auto-applied on boot)
├── uploads/               # Local scratch folders (files themselves live on Telegram)
├── logs/                  # Rotated log files
├── .env.example
├── package.json
├── ecosystem.config.js    # PM2 config
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js **22+**
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- Your numeric Telegram user ID (get it from [@userinfobot](https://t.me/userinfobot))

### 2. Install

```bash
git clone <your-repo-url> basirhat-bot
cd basirhat-bot
npm install
```

### 3. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```env
BOT_TOKEN=your_botfather_token
ADMIN_IDS=111111111,222222222
PORT=3000
DATABASE=sqlite
BOT_MODE=polling
```

### 4. Run

```bash
npm start
```

The database schema is created automatically on first run (`database/bot.db`). Message your bot on Telegram with `/start` to confirm it's alive, and `/admin` (as an ID in `ADMIN_IDS`) to open the admin panel.

---

## ⚙️ Configuration Reference

All variables are documented in `.env.example`. Key ones:

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Token from BotFather (required) |
| `ADMIN_IDS` | Comma-separated numeric Telegram IDs allowed into `/admin` |
| `PORT` | HTTP server port (health check / webhook) |
| `BOT_MODE` | `polling` (default, simplest) or `webhook` |
| `WEBHOOK_URL` / `WEBHOOK_PATH` | Required only when `BOT_MODE=webhook` |
| `DATABASE` | `sqlite` (default) or `mysql` (see migration notes below) |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | Per-user command throttling |
| `BROADCAST_MESSAGES_PER_SECOND` | Throttles broadcast sends to respect Telegram flood limits |
| `BACKUP_INTERVAL_HOURS` | Automatic DB backup frequency |
| `MAX_FILE_SIZE_MB` | Upload size guard |

---

## 🗄️ Database

The default driver is **SQLite** (`better-sqlite3`), stored at `database/bot.db`, with WAL mode enabled for concurrent reads/writes. The full schema lives in `database/schema.sql` and is applied automatically and idempotently on every boot.

Tables: `users`, `messages`, `notices`, `broadcasts`, `files`, `routines`, `results`, `syllabus`, `settings`, `logs`, `links`.

### Migrating to MySQL

`src/database.js` exposes a small adapter interface (`get`, `all`, `run`, `exec`, `transaction`, `backup`, `close`) that all services depend on — never raw SQL driver calls. To migrate:

1. `npm install mysql2`
2. Create `src/database.mysql.js` implementing a `MySQLAdapter` class with the same method signatures as `SQLiteAdapter` in `src/database.js`.
3. In `src/database.js`, replace the `throw new Error(...)` inside the `driver === 'mysql'` branch of `initDatabase()` with `adapter = new MySQLAdapter(config.database.mysql)`.
4. Adjust `database/schema.sql` types if needed (e.g. `INTEGER PRIMARY KEY AUTOINCREMENT` → `INT AUTO_INCREMENT PRIMARY KEY`, `DATETIME DEFAULT CURRENT_TIMESTAMP` works the same in MySQL).
5. Set `DATABASE=mysql` and the `MYSQL_*` variables in `.env`.

No service or command code needs to change — they only call the adapter interface.

---

## 🔐 Security

- **Helmet** sets secure HTTP headers on the Express server.
- **CORS** enabled for the HTTP layer (health check/webhook only — bot logic isn't exposed via CORS-sensitive routes).
- **express-rate-limit** protects the HTTP server; a separate in-memory per-user limiter (`src/middleware/rateLimiter.js`) throttles Telegram command/message abuse.
- **Admin verification** (`src/middleware/adminAuth.js`) checks the caller's numeric Telegram ID against `ADMIN_IDS` before any admin action executes.
- **SQL injection protection**: every query in `src/services/*` and `src/database.js` uses parameterized statements — no string concatenation of user input into SQL.
- **Input validation** (`src/utils/validators.js`) guards notice titles/content, search keywords, URLs, file extensions, and scheduled broadcast timestamps before they touch the database or Telegram API.
- Secrets are never hard-coded — everything sensitive comes from `.env` (which is git-ignored).

---

## 📝 Logging

Powered by Winston with daily-rotating files under `logs/`:
- `error-YYYY-MM-DD.log` — errors only
- `combined-YYYY-MM-DD.log` — all log levels
- `activity-YYYY-MM-DD.log` — structured events: `COMMAND`, `USER_JOIN`, `USER_LEAVE`, `BROADCAST`, `UPLOAD`, `EXPORT_CSV`, `BACKUP`, `MAINTENANCE_TOGGLE`

Console output is also enabled (captured by PM2 into `logs/pm2-out.log` / `logs/pm2-error.log`).

---

## 🔁 Error Handling & Reliability

- Every command/handler is wrapped (`src/middleware/errorHandler.js`) so a thrown error is logged and the user gets a friendly fallback message instead of a silent failure.
- `polling_error` / `webhook_error` events are logged without crashing the process; `node-telegram-bot-api` automatically keeps retrying polling under the hood.
- `unhandledRejection` and `uncaughtException` are caught at the process level and logged; on an uncaught exception the process exits cleanly so PM2 can restart it (**auto restart**).
- `SIGINT` / `SIGTERM` trigger a graceful shutdown: polling is stopped, the HTTP server is closed, then the process exits.
- Automatic database backups run on a cron schedule (`BACKUP_INTERVAL_HOURS`), in addition to the on-demand "Backup Now" admin button.

---

## 🖥️ Deployment

### PM2 (VPS / dedicated server)

```bash
npm install
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the printed command to enable boot-time startup
pm2 logs basirhatcollege-updates-bot
```

### VPS (Ubuntu) — from scratch

```bash
sudo apt update && sudo apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

git clone <your-repo-url> basirhat-bot && cd basirhat-bot
npm install
cp .env.example .env   # then edit with your real values
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Railway

1. Push this repo to GitHub.
2. Create a new Railway project → "Deploy from GitHub repo".
3. Set environment variables from `.env.example` in the Railway dashboard (`BOT_TOKEN`, `ADMIN_IDS`, etc.).
4. Railway auto-detects `npm start`. Set `PORT` to Railway's provided variable if required (Railway usually injects `PORT` automatically — the app already reads `process.env.PORT`).
5. If you want Railway's persistent disk for the SQLite file, mount a volume at `database/` and set `SQLITE_PATH` accordingly; otherwise use `webhook` mode with a public Railway URL.

### Render

1. New "Web Service" → connect your GitHub repo.
2. Build command: `npm install`. Start command: `npm start`.
3. Add the same environment variables as above in Render's dashboard.
4. Render provides a public HTTPS URL — set `BOT_MODE=webhook`, `WEBHOOK_URL=https://<your-service>.onrender.com`, keep `WEBHOOK_PATH=/telegram/webhook`.
5. Attach a Render Disk if you want the SQLite file to persist across deploys (otherwise it resets on each deploy — export/backup regularly, or migrate to MySQL/a managed Postgres-compatible store for production scale).

### Polling vs Webhook

- **Polling** (`BOT_MODE=polling`, default) — simplest, works anywhere including behind NAT, no public URL needed. Best for a VPS/PM2 setup.
- **Webhook** (`BOT_MODE=webhook`) — requires a public HTTPS URL (`WEBHOOK_URL`). Better suited to platforms like Render/Railway that give you a stable public domain. The Express route at `WEBHOOK_PATH` receives updates and forwards them to the bot.

---

## 🧑‍💻 Development

```bash
npm run dev     # runs with --watch for auto-reload
npm run lint    # ESLint check
npm run backup  # trigger a manual database backup from the CLI
```

---

## 📄 License

MIT — feel free to adapt this for your own institution.
