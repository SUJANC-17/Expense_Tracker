<div align="center">

# Expense Tracker

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

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running Locally](#running-locally)
- [Building for Production](#building-for-production)
- [API Overview](#api-overview)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [License](#license)

---

## Overview

**Expense Tracker** is a monorepo full-stack web application for personal finance management. It pairs a React frontend (Vite + TypeScript + Tailwind CSS) with a Node.js/Express REST API backed by SQLite via `sql.js` — no native bindings required. Firebase handles user authentication; the server verifies ID tokens using the Firebase Admin SDK so credentials are never stored locally.

The app is designed to run on **Windows** and **Linux**, and can be self-hosted behind any reverse proxy or Cloudflare tunnel.

---

## Features

| Feature | Description |
|---|---|
| Authentication | Firebase Auth (email/password, Google OAuth) + server-side token verification |
| Income Tracking | Log and categorise multiple income sources per month |
| Expense Tracking | Add, edit, and delete expenses with categories, tags, and notes |
| Budget Management | Set monthly budgets per category with real-time progress tracking |
| Split Bills | Create group splits, track balances, and mark settlements between friends |
| Friends | Manage a friends list used for split billing |
| Dashboard & Charts | Visual financial summary powered by Recharts |
| Automated Reports | Scheduled monthly PDF reports delivered via email |
| Reminders | Configurable daily reminder notifications |
| Admin Dashboard | Full user management, activity logs, and system stats |
| Scheduled Jobs | Auto-cleanup, monthly report generation, and daily reminders via `node-cron` |

---

## Tech Stack

### Frontend (`client/`)

| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite 6 | Build tool and dev server |
| Tailwind CSS 4 | Utility-first styling |
| Radix UI | Accessible headless components |
| Material UI (MUI) 7 | Additional UI components |
| Framer Motion | Animations and transitions |
| Recharts | Data visualisation charts |
| React Hook Form | Form state management |
| Firebase SDK 12 | Client-side authentication |
| Lucide React | Icon library |
| Sonner | Toast notifications |
| date-fns | Date utilities |

### Backend (`server/`)

| Technology | Purpose |
|---|---|
| Node.js + Express 4 | HTTP server and REST API |
| TypeScript 5 | Type safety |
| sql.js (SQLite) | Embedded database, no native deps |
| Firebase Admin SDK | Server-side token verification |
| JSON Web Tokens (JWT) | Admin session tokens |
| Nodemailer | SMTP email delivery |
| PDFKit | PDF report generation |
| node-cron | Scheduled background jobs |
| compression | Gzip HTTP response compression |

---

## Project Structure

The tree below reflects only the files that are tracked in this repository. Environment files, build output, database files, and local-only scripts are excluded by `.gitignore`.

```
Expense-Tracker/
├── .gitignore
├── LICENSE
├── README.md
├── start_all.bat                        # Windows: one-click start for dev
│
├── client/                              # React frontend (Vite)
│   ├── .env.example                     # Client environment template
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts                   # Vite config + /api proxy
│   ├── tsconfig.json
│   ├── public/                          # Static assets (favicons, manifest)
│   └── src/
│       ├── App.tsx                      # Root router
│       ├── UserApp.tsx                  # Authenticated user shell
│       ├── appTypes.ts                  # Shared TypeScript types
│       ├── main.tsx
│       ├── config/
│       │   └── firebase.ts              # Firebase SDK initialisation
│       ├── context/
│       │   └── AuthContext.tsx          # Auth context provider
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   └── useData.ts
│       ├── styles/
│       │   ├── fonts.css
│       │   ├── index.css
│       │   ├── tailwind.css
│       │   └── theme.css
│       ├── utils/
│       │   ├── api.ts                   # Typed API client
│       │   ├── adminApi.ts              # Admin API helpers
│       │   ├── authErrors.ts
│       │   ├── budget.ts
│       │   ├── categories.ts
│       │   └── storage.ts
│       └── components/
│           ├── Auth.tsx                 # Auth page wrapper
│           ├── AuthForm.tsx             # Login / register form
│           ├── Dashboard.tsx            # Main dashboard and charts
│           ├── Expenses.tsx             # Expense list and filters
│           ├── ExpenseManager.tsx       # Add/edit expense modal
│           ├── Income.tsx               # Income list
│           ├── IncomeManager.tsx        # Add/edit income modal
│           ├── Splits.tsx               # Split bills overview
│           ├── SplitManager.tsx         # Split creation and settlement
│           ├── Friends.tsx              # Friends list
│           ├── FriendsManager.tsx       # Add/remove friends
│           ├── Settings.tsx             # User settings
│           ├── SettingsReports.tsx      # Reports and reminder config
│           ├── SkeletonLoader.tsx       # Loading skeleton UI
│           ├── PrivacyPolicy.tsx        # Privacy policy page
│           ├── admin/
│           │   └── AdminDashboard.tsx   # Admin panel
│           ├── figma/
│           │   └── ImageWithFallback.tsx
│           └── ui/                      # Shared Radix-based primitives
│               └── (accordion, button, card, dialog, ...)
│
└── server/                              # Express REST API
    ├── .env.example                     # Server environment template
    ├── .gitignore
    ├── package.json
    ├── tsconfig.json
    ├── categories.json                  # Default category seed data
    ├── users_schema.json
    └── src/
        ├── index.ts                     # App entry point
        ├── config/
        │   ├── db.ts                    # sql.js database connection
        │   └── firebase.ts              # Firebase Admin initialisation
        ├── middleware/
        │   ├── auth.ts                  # Firebase / JWT auth middleware
        │   └── adminAuth.ts             # Admin-only middleware
        ├── models/
        │   ├── schema.ts                # SQLite schema initialisation
        │   └── userSchema.ts
        ├── controllers/
        │   ├── expenseController.ts
        │   ├── incomeController.ts
        │   ├── splitController.ts
        │   ├── summaryController.ts
        │   └── friendController.ts
        ├── routes/
        │   ├── auth.ts                  # /api/auth
        │   ├── expense.ts               # /api/expenses
        │   ├── income.ts                # /api/incomes
        │   ├── split.ts                 # /api/splits
        │   ├── summary.ts               # /api/summary
        │   ├── friend.ts                # /api/friends
        │   ├── budgets.ts               # /api/budgets
        │   ├── reports.ts               # /api/reports
        │   ├── reminder.ts              # /api/reminders
        │   └── admin.ts                 # /api/admin
        ├── services/
        │   ├── scheduler.ts             # Monthly report scheduler
        │   ├── dailyReminderScheduler.ts
        │   ├── cleanupService.ts        # Periodic data cleanup
        │   ├── emailService.ts          # Nodemailer email sender
        │   ├── pdfService.ts            # PDFKit report generator
        │   ├── splitBalanceService.ts
        │   └── authOtpService.ts
        ├── scripts/
        │   └── repairData.ts
        └── utils/
            ├── activityLog.ts
            ├── budget.ts
            ├── reminder.ts
            └── tableUtils.ts
```

> **Not tracked in this repository:** `.env` files, `firebase-service-account.json`, `node_modules/`, `dist/`, `server/data/` (SQLite database), and any local shell scripts for tunnelling or watchdog services.

---

## Prerequisites

- Node.js v18 or later and npm v9+
- A Firebase project with Authentication enabled (Email/Password and/or Google)
- A Firebase Admin SDK service account JSON key
- SMTP credentials (optional) for automated email report delivery

---

## Getting Started

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
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Open each `.env` file and fill in the required values. See the [Environment Variables](#environment-variables) section for details.

### 4. Firebase setup

1. Open the [Firebase Console](https://console.firebase.google.com/) and create or select a project.
2. Go to **Authentication → Sign-in method** and enable **Email/Password** (and Google if desired).
3. Go to **Project Settings → General → Your apps** and copy the web config values into `client/.env` (`VITE_FIREBASE_*` keys).
4. Go to **Project Settings → Service Accounts → Generate new private key** and save the downloaded JSON as `server/firebase-service-account.json` (or update `FIREBASE_SERVICE_ACCOUNT_PATH` in `server/.env` to point to it).

---

## Running Locally

### Windows

```bat
start_all.bat
```

Opens two terminal windows and starts:

| Service | URL |
|---|---|
| Backend API | `http://127.0.0.1:3000` |
| Frontend | `http://localhost:5173` |

The Vite dev server proxies all `/api` requests to the backend, so no CORS configuration is needed in development.

### Manual start

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

---

## Building for Production

### Frontend

```bash
cd client
npm run build
# Output: client/dist/
```

### Backend

```bash
cd server
npm run build
# Output: server/dist/

npm start
```

> In production the Express server also serves the compiled React bundle from `client/dist/`, so only a single process is needed. Point your reverse proxy (nginx, Caddy, Cloudflare Tunnel, etc.) at the backend port.

---

## API Overview

All routes are prefixed with `/api`. Protected routes require an `Authorization: Bearer <firebase-id-token>` header.

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Health check — returns DB connection status |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate and receive a token |
| `GET` / `PUT` | `/api/auth/profile` | Get or update user profile |
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

## Environment Variables

### Client — `client/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API base URL. Use `/api` for local dev (proxied by Vite). |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | No | Firebase Analytics measurement ID |

### Server — `server/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Yes | `3000` | Port the Express server listens on |
| `HOST` | Yes | `0.0.0.0` | Bind address |
| `DB_PATH` | Yes | `./data/expense_tracker.db` | Path to the SQLite database file |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Yes | `./firebase-service-account.json` | Path to Firebase Admin SDK JSON key |
| `JWT_SECRET` | Yes | — | Secret for signing admin JWTs. Change this in production. |
| `APP_FRONTEND_URL` | Yes | — | Public frontend URL, used in email report links |
| `CORS_ALLOWED_ORIGINS` | Yes | — | Comma-separated list of allowed CORS origins |
| `SMTP_HOST` | No | `smtp.zoho.com` | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_SECURE` | No | `false` | Set to `true` for TLS (port 465) |
| `SMTP_USER` | No | — | SMTP login email address |
| `SMTP_PASS` | No | — | SMTP password or app-specific password |
| `SMTP_FROM` | No | — | Sender address shown in report emails |

---

## Architecture

```
+--------------------------------------------------+
|                 Browser / Client                 |
|  React 18  Vite  Tailwind CSS  Recharts          |
|  Firebase Auth SDK  Radix UI  MUI  Framer Motion |
+------------------------+--------------------------+
                         |  HTTPS  /api proxy
+------------------------v--------------------------+
|            Express REST API  (Node.js)           |
|  Firebase Admin SDK  JWT Middleware              |
|  Controllers  Services  Models                   |
|  PDFKit  Nodemailer  node-cron  compression      |
+------------------------+--------------------------+
                         |
              +----------v-----------+
              |    SQLite (sql.js)   |
              |  expense_tracker.db  |
              +----------------------+
```

**Key design decisions:**

- `sql.js` is used instead of `better-sqlite3` so the server runs on any platform without compiling native Node addons.
- Firebase Auth handles user identity. The server verifies ID tokens via the Admin SDK — passwords are never stored locally.
- In production, Express serves the compiled React bundle from `client/dist/`, so only one process is needed.
- Scheduled jobs (`node-cron`) run in-process for monthly report generation, daily reminders, and automatic data cleanup.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

Copyright © 2026 [SUJANC-17](https://github.com/SUJANC-17)
