# Quick Start Guide - Expense Tracker

## Current Issue: MySQL Password

Your `.env` file still has `DB_PASSWORD=your_password` which needs to be your actual MySQL password.

## Step-by-Step Setup

### 1. Fix MySQL Connection

**Option A: If you know your MySQL password**
- Open `d:\Expense-Tracker\server\.env`
- Change line 4: `DB_PASSWORD=YourActualPassword`

**Option B: If you don't know the password**
Try these common defaults:
- Empty password: `DB_PASSWORD=`
- Default: `DB_PASSWORD=root`
- XAMPP default: `DB_PASSWORD=` (empty)

**Option C: Reset MySQL Password**
```bash
# Open MySQL command line and run:
ALTER USER 'root'@'localhost' IDENTIFIED BY 'newpassword';
FLUSH PRIVILEGES;
```

### 2. Create Database

Open MySQL command line or phpMyAdmin and run:
```sql
CREATE DATABASE expense_tracker;
```

### One-Click Start (Recommended)
Double-click `start_all.bat` in the root folder. It will open 4 windows for you automatically.

### Manual Startup (If double-click doesn't work)

You need **4 separate terminals**.

1. **Backend**:
   ```bash
   cd server
   npm run dev
   ```

2. **Frontend**:
   ```bash
   cd client
   npm run dev
   ```

3. **Proxy Server** (Important!):
   ```bash
   cd server
   node proxy.js
   ```

4. **Ngrok**:
   ```bash
   cd ngrok
   ngrok start --all --config ngrok_config.yml
   ```

### 5. Open Application

Go to your ngrok URL: **https://elke-nonstrategic-shad.ngrok-free.dev**
(Or find it at http://localhost:4040)

---

## Firebase Setup (Can Do Later)

The Firebase errors are non-critical. The app will work without it initially, but you'll need it for authentication:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project
3. Enable Email/Password authentication
4. Download service account JSON → save as `firebase-service-account.json` in server folder
5. Get web config → update client `.env` file

---

## Quick Test Without Firebase

You can test the database connection first:

1. Fix MySQL password in `.env`
2. Create the database
3. Start the server
4. You should see "Database initialized" without errors

Then we can add Firebase later!
