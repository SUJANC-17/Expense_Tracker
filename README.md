# Expense Tracker

Personal expense tracker with a Vite + React frontend and a TypeScript + Express backend. The app supports authentication, income and expense tracking, split management, reports, reminders, and an admin view.

## Project Layout

- `client/` - React frontend
- `server/` - Express API and database logic
- `start_all.bat` - Windows helper to start both services
- `start_termux.sh` - Termux helper for Android/local device setups

## Requirements

- Node.js and npm
- Firebase project credentials for the client
- Firebase Admin service account for the server
- Optional SMTP credentials if you want report emails

## Setup

1. Install dependencies in both apps:

```bash
cd client
npm install

cd ../server
npm install
```

2. Create environment files from the examples:

- `client/.env` from `client/.env.example`
- `server/.env` from `server/.env.example`

3. Fill in the required values.

### Client environment

Important variables in `client/.env`:

- `VITE_API_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### Server environment

Important variables in `server/.env`:

- `PORT`
- `HOST`
- `DB_PATH`
- `FIREBASE_SERVICE_ACCOUNT_PATH`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `APP_FRONTEND_URL`
- `CORS_ALLOWED_ORIGINS`
- `JWT_SECRET`

## Run Locally

### Windows

Use the helper script:

```bat
start_all.bat
```

This starts:

- Backend on `http://127.0.0.1:3000`
- Frontend on `http://localhost:5173`

### Manual start

From two terminals:

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

The Vite dev server proxies `/api` to `http://127.0.0.1:3000`.

### Termux / Android

Use:

```bash
./start_termux.sh
```

The script installs dependencies if needed, starts both services, and can keep the API reachable on the device via the configured tunnel flow.

## Build

Frontend:

```bash
cd client
npm run build
```

Backend:

```bash
cd server
npm run build
```

## Notes

- The client has a user app and an admin dashboard route.
- The backend initializes the database on startup and runs scheduled jobs for reports, cleanup, and reminders.
- If you change the backend port, update `VITE_API_URL` or the Vite proxy configuration accordingly.

For more detailed module-level notes, see:

- [`client/README.md`](client/README.md)
- [`server/README.md`](server/README.md)
