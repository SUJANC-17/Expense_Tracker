<div align="center">

# 💸 Expense Tracker

**A full-stack personal finance management application — track expenses, income, budgets, splits, and automated reports, all in one place.**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![SQLite](https://img.shields.io/badge/SQLite-sql.js-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sql.js.org)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](./LICENSE)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Running Locally](#-running-locally)
- [Building for Production](#-building-for-production)
- [API Overview](#-api-overview)
- [Environment Variables](#-environment-variables)
- [Architecture](#-architecture)
- [License](#-license)

---

## 🌟 Overview

**Expense Tracker** is a monorepo full-stack web application for personal finance management. It provides a polished React frontend (Vite + TypeScript + Tailwind CSS) paired with a Node.js/Express REST API backed by SQLite (via `sql.js` — no native bindings required). Firebase handles user authentication, while the server verifies ID tokens using the Firebase Admin SDK so credentials are never stored locally.

The app runs on **Windows**, **Linux**, and **Android (Termux)**, and can be self-hosted behind any reverse proxy or Cloudflare tunnel.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Authentication** | Firebase Auth (email/password, Google OAuth) + server-side token verification |
| 💰 **Income Tracking** | Log and categorise multiple income sources per month |
| 📊 **Expense Tracking** | Add, edit, and delete expenses with categories, tags, and notes |
| 📂 **Budget Management** | Set monthly budgets per category with real-time progress tracking |
| 🤝 **Split Bills** | Create group splits, track balances, and mark settlements between friends |
| 👥 **Friends** | Manage a friends list used for split billing |
| 📈 **Dashboard & Charts** | Visual financial summary powered by Recharts |
| 📄 **Automated Reports** | Scheduled monthly PDF reports delivered via email |
| ⏰ **Reminders** | Configurable daily reminder notifications |
| 🛡️ **Admin Dashboard** | Full user management, activity logs, and system stats |
| 🔄 **Scheduled Jobs** | Auto-cleanup, monthly report generation, and daily reminders via `node-cron` |
| 📱 **Cross-Platform** | Runs on Windows desktop and Android via Termux |

---

## 🛠 Tech Stack

### Frontend (`client/`)

| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite 6 | Build tool & dev server |
| Tailwind CSS 4 | Utility-first styling |
| Radix UI | Accessible headless components |
| Material UI (MUI) 7 | Additional UI components |
| Framer Motion | Animations & transitions |
| Recharts | Data visualisation charts |
| React Hook Form | Form state management |
| Firebase SDK 12 | Client-side authentication |
| Lucide React | Icon library |
| Sonner | Toast notifications |
| date-fns | Date utilities |

### Backend (`server/`)

| Technology | Purpose |
|---|---|
| Node.js + Express 4 | HTTP server & REST API |
| TypeScript 5 | Type safety |
| sql.js (SQLite) | Embedded database (no native deps) |
| Firebase Admin SDK | Server-side token verification |
| JSON Web Tokens (JWT) | Admin session tokens |
| Nodemailer | SMTP email delivery |
| PDFKit | PDF report generation |
| node-cron | Scheduled background jobs |
| compression | Gzip HTTP response compression |

---

## 📁 Project Structure

```
Expense-Tracker/
├── client/                          # React frontend (Vite)
│   ├── public/                      # Static public assets
│   ├── src/
│   │   ├── components/              # UI components
│   │   │   ├── admin/
│   │   │   │   └── AdminDashboard.tsx   # Admin panel
│   │   │   ├── ui/                  # Shared UI primitives
│   │   │   ├── Auth.tsx             # Auth page wrapper
│   │   │   ├── AuthForm.tsx         # Login / register form
│   │   │   ├── Dashboard.tsx        # Main dashboard & charts
│   │   │   ├── Expenses.tsx         # Expense list & filters
│   │   │   ├── ExpenseManager.tsx   # Add/edit expense modal
│   │   │   ├── Income.tsx           # Income list
│   │   │   ├── IncomeManager.tsx    # Add/edit income modal
│   │   │   ├── Splits.tsx           # Split bills overview
│   │   │   ├── SplitManager.tsx     # Split creation & settlement
│   │   │   ├── Friends.tsx          # Friends list
│   │   │   ├── FriendsManager.tsx   # Add/remove friends
│   │   │   ├── Settings.tsx         # User settings
│   │   │   ├── SettingsReports.tsx  # Reports & reminder config
│   │   │   ├── SkeletonLoader.tsx   # Loading skeleton UI
│   │   │   └── PrivacyPolicy.tsx    # Privacy policy page
│   │   ├── context/                 # React context providers
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── config/                  # Firebase & app config
│   │   ├── styles/                  # Global stylesheets
│   │   ├── utils/                   # Utility helpers
│   │   ├── appTypes.ts              # Shared TypeScript types
│   │   ├── App.tsx                  # Root app (routing)
│   │   └── UserApp.tsx              # Authenticated user shell
│   ├── .env.example                 # Client environment template
│   ├── vite.config.ts               # Vite config + /api proxy
│   └── package.json
│
├── server/                          # Express REST API
│   ├── src/
│   │   ├── config/                  # DB & app configuration
│   │   ├── controllers/             # Route handler logic
│   │   │   ├── expenseController.ts
│   │   │   ├── incomeController.ts
│   │   │   ├── splitController.ts
│   │   │   ├── summaryController.ts
│   │   │   └── friendController.ts
│   │   ├── middleware/
│   │   │   └── auth.ts              # Firebase / JWT auth middleware
│   │   ├── models/
│   │   │   └── schema.ts            # SQLite schema initialisation
│   │   ├── routes/                  # Express route definitions
│   │   │   ├── auth.ts              # /api/auth
│   │   │   ├── expense.ts           # /api/expenses
│   │   │   ├── income.ts            # /api/incomes
│   │   │   ├── split.ts             # /api/splits
│   │   │   ├── summary.ts           # /api/summary
│   │   │   ├── friend.ts            # /api/friends
│   │   │   ├── budgets.ts           # /api/budgets
│   │   │   ├── reports.ts           # /api/reports
│   │   │   ├── reminder.ts          # /api/reminders
│   │   │   └── admin.ts             # /api/admin
│   │   ├── services/                # Business logic & background jobs
│   │   │   ├── scheduler.ts             # Monthly report scheduler
│   │   │   ├── dailyReminderScheduler.ts # Daily reminder jobs
│   │   │   ├── cleanupService.ts        # Periodic data cleanup
│   │   │   ├── emailService.ts          # Nodemailer email sender
│   │   │   ├── pdfService.ts            # PDFKit report generator
│   │   │   ├── splitBalanceService.ts   # Split balance logic
│   │   │   └── authOtpService.ts        # OTP helpers
│   │   ├── utils/                   # Shared server utilities
│   │   └── index.ts                 # App entry point
│   ├── data/                        # SQLite DB files (git-ignored)
│   ├── .env.example                 # Server environment template
│   └── package.json
│
├── start_all.bat                    # Windows: one-click start
├── start_termux.sh                  # Android/Termux: full setup & launch
├── tunnel_watchdog.sh               # Tunnel keep-alive watchdog
├── .gitignore
├── LICENSE                          # MIT
└── README.md
```

---

## ✅ Prerequisites

- **Node.js** v18 or later + **npm** v9+
- A **Firebase project** with Authentication enabled (Email/Password and/or Google)
- A Firebase **Admin SDK** service account JSON key (for the server)
- *(Optional)* SMTP credentials for automated email report delivery

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/SUJANC-17/Expense_Tracker.git
cd Expense_Tracker
```

### 2. Install dependencies

```bash
# Frontend
cd client && npm install

# Backend
cd ../server && npm install
```

### 3. Configure environment variables

```bash
# Copy templates
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Fill in the values — see the [Environment Variables](#-environment-variables) section for details.

### 4. Firebase setup

1. Open the [Firebase Console](https://console.firebase.google.com/) and create (or select) a project.
2. Go to **Authentication → Sign-in method** and enable **Email/Password** (and Google if desired).
3. Go to **Project Settings → General → Your apps** and copy the web config into `client/.env` (`VITE_FIREBASE_*` keys).
4. Go to **Project Settings → Service Accounts → Generate new private key** and save the JSON as `server/firebase-service-account.json` (or update `FIREBASE_SERVICE_ACCOUNT_PATH` in `server/.env`).

---

## 🖥 Running Locally

### Windows (One-Click)

```bat
start_all.bat
```

Opens two terminal windows and starts:

| Service | URL |
|---|---|
| Backend API | `http://127.0.0.1:3000` |
| Frontend | `http://localhost:5173` |

> The Vite dev server proxies all `/api` requests to the backend, so no CORS configuration is needed during development.

### Manual Start

```bash
# Terminal 1 – Backend
cd server
npm run dev

# Terminal 2 – Frontend
cd client
npm run dev
```

### Android / Termux

The included shell script installs all dependencies (if missing), starts both services, and optionally sets up a Cloudflare tunnel for remote access.

```bash
chmod +x start_termux.sh
./start_termux.sh
```

To keep the tunnel alive automatically:

```bash
chmod +x tunnel_watchdog.sh
./tunnel_watchdog.sh
```

---

## 📦 Building for Production

### Frontend

```bash
cd client
npm run build
# Output → client/dist/
```

### Backend

```bash
cd server
npm run build
# Output → server/dist/

# Start the production server
npm start
```

> **Tip:** In production the Express server also serves the compiled frontend from `client/dist/`, so only one process is needed. Point your reverse proxy (nginx, Caddy, Cloudflare Tunnel, etc.) at the backend port.

---

## 🔌 API Overview

All routes are prefixed with `/api`. Protected routes require an `Authorization: Bearer <firebase-id-token>` header.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Health check — returns DB connection status |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate and receive a token |
| `GET/PUT` | `/api/auth/profile` | Get or update user profile |
| `GET/POST/PUT/DELETE` | `/api/expenses` | CRUD for expense records |
| `GET/POST/PUT/DELETE` | `/api/incomes` | CRUD for income records |
| `GET/POST/PUT/DELETE` | `/api/splits` | Split bill management |
| `GET/POST/DELETE` | `/api/friends` | Friends list management |
| `GET/POST/PUT/DELETE` | `/api/budgets` | Monthly category budgets |
| `GET` | `/api/summary` | Aggregated financial summary |
| `GET/POST` | `/api/reports` | Report management |
| `POST` | `/api/reports/generate` | Manually trigger a PDF report email |
| `GET/POST/PUT/DELETE` | `/api/reminders` | User reminder preferences |
| `GET/...` | `/api/admin/...` | Admin-only: users, activity logs, system stats |

---

## ⚙ Environment Variables

### Client (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend API base URL. Use `/api` for local dev (proxied by Vite). |
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | ⬜ | Firebase Analytics measurement ID (optional) |

### Server (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | ✅ | `3000` | Port the Express server listens on |
| `HOST` | ✅ | `0.0.0.0` | Bind address (`0.0.0.0` for Termux/LAN access) |
| `DB_PATH` | ✅ | `./data/expense_tracker.db` | Path to the SQLite database file |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | ✅ | `./firebase-service-account.json` | Path to Firebase Admin SDK JSON key |
| `JWT_SECRET` | ✅ | — | Secret key for signing admin JWTs — **change in production** |
| `APP_FRONTEND_URL` | ✅ | — | Public frontend URL (used in email report links) |
| `CORS_ALLOWED_ORIGINS` | ✅ | — | Comma-separated allowed CORS origins |
| `SMTP_HOST` | ⬜ | `smtp.zoho.com` | SMTP server hostname |
| `SMTP_PORT` | ⬜ | `587` | SMTP port |
| `SMTP_SECURE` | ⬜ | `false` | Use TLS (`true` for port 465) |
| `SMTP_USER` | ⬜ | — | SMTP login email address |
| `SMTP_PASS` | ⬜ | — | SMTP password or app-specific password |
| `SMTP_FROM` | ⬜ | — | Sender address displayed in report emails |

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────┐
│                  Browser / Client                  │
│   React 18 · Vite · Tailwind CSS · Recharts       │
│   Firebase Auth SDK · Radix UI · MUI · Framer     │
└───────────────────────┬────────────────────────────┘
                        │  HTTPS  /api proxy
┌───────────────────────▼────────────────────────────┐
│             Express REST API  (Node.js)            │
│   Firebase Admin SDK · JWT Middleware              │
│   Controllers → Services → Models                  │
│   PDFKit · Nodemailer · node-cron · compression   │
└───────────────────────┬────────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │   SQLite (sql.js)  │
              │  expense_tracker.db │
              └────────────────────┘
```

**Key design decisions:**

- **`sql.js`** is used instead of `better-sqlite3` so the server runs anywhere — including Android/Termux — without compiling native Node addons.
- **Firebase Auth** handles user identity; the server verifies ID tokens via the Admin SDK — user passwords are never stored locally.
- In **production**, Express serves the compiled React bundle from `client/dist/`, so only a single process is needed.
- **Scheduled jobs** (`node-cron`) run in-process for monthly report generation, daily reminders, and automatic old-data cleanup.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

Copyright © 2026 [SUJANC-17](https://github.com/SUJANC-17)

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/SUJANC-17">SUJANC-17</a>
</div>
