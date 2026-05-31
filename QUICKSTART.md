# Quick Start Guide - Expense Tracker

## 1. Fix Database Settings

Open `server/.env` and make sure `DB_PASSWORD` matches your MySQL password.

## 2. Create the Database

Run this in MySQL or phpMyAdmin:

```sql
CREATE DATABASE expense_tracker;
```

## 3. Start the App

### Remote access with Cloudflare

Double-click `start_cloudflare.bat` in the repo root.

This starts:

1. Backend on port `3000`
2. Frontend on port `5173`
3. Cloudflare tunnel for `http://localhost:5173`

Cloudflare will print the public URL in the tunnel window.

### Local-only

If you do not want a tunnel, use `start_all.bat` instead.

## 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project
3. Enable Email/Password authentication
4. Download the service account JSON and save it as `server/firebase-service-account.json`
5. Update `client/.env` with your Firebase web config
6. Add your Cloudflare tunnel domain to Firebase Authorized Domains if needed

## 5. If You Only Want to Verify the Backend

1. Fix the MySQL password
2. Create the database
3. Start the backend
4. Confirm the console shows `Database initialized`

Then start the frontend and Cloudflare tunnel.
