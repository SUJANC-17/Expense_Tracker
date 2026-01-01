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

### 3. Start Backend Server

```bash
cd d:\Expense-Tracker\server
npm run dev
```

**Expected output:**
```
Server is running on port 5000
Connected to MySQL database
Database tables initialized successfully
Monthly report scheduler started
```

### 4. Start Frontend (in a NEW terminal)

```bash
cd d:\Expense-Tracker\client
npm install
npm run dev
```

**Expected output:**
```
VITE ready in xxx ms
➜  Local:   http://localhost:5173/
```

### 5. Open Application

Go to: `http://localhost:5173`

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
