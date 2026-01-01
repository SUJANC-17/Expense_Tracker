# Personal Expense Tracker

A comprehensive full-stack expense tracking application with Firebase authentication, MySQL database, automated PDF reporting, and email notifications.

## Features

✅ **User Authentication** - Secure Firebase-based authentication  
✅ **Dashboard** - View current month balance, income, and expenses  
✅ **Income Management** - Track all income sources with CRUD operations  
✅ **Expense Management** - Categorized expense tracking  
✅ **Split Expenses** - Track shared expenses with friends and payment status  
✅ **Monthly Reports** - Automated PDF generation and email delivery  
✅ **Modern UI** - Dark theme with glassmorphism effects  

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- MySQL (with mysql2)
- Firebase Admin SDK
- PDFKit for PDF generation
- Nodemailer for email
- Node-cron for scheduling

### Frontend
- React + TypeScript
- Vite
- React Router
- Firebase Authentication
- Modern CSS with glassmorphism

## Prerequisites

- Node.js (v18 or higher)
- MySQL Server
- Firebase Project
- SMTP Email Account (Gmail recommended)

## Setup Instructions

### 1. Database Setup

Create a MySQL database:

```sql
CREATE DATABASE expense_tracker;
```

The application will automatically create the required tables on first run.

### 2. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Email/Password authentication
3. Download the service account JSON file for backend
4. Get the Firebase config for frontend

### 3. Backend Configuration

Navigate to the server directory:

```bash
cd server
npm install
```

Create `.env` file in `server` directory:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=expense_tracker
DB_PORT=3306
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

Place your Firebase service account JSON file in the `server` directory.

### 4. Frontend Configuration

Navigate to the client directory:

```bash
cd client
npm install
```

Create `.env` file in `client` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Running the Application

### Start Backend Server

```bash
cd server
npm run dev
```

Server will run on `http://localhost:5000`

### Start Frontend

```bash
cd client
npm run dev
```

Frontend will run on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user in database

### Income
- `GET /api/incomes` - Get all incomes
- `POST /api/incomes` - Add new income
- `PUT /api/incomes/:id` - Update income
- `DELETE /api/incomes/:id` - Delete income

### Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/categories` - Get categories
- `POST /api/expenses` - Add new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Splits
- `GET /api/splits` - Get all split expenses
- `GET /api/splits/unpaid` - Get unpaid splits
- `POST /api/splits` - Add new split
- `PUT /api/splits/:id` - Update split
- `PUT /api/splits/:id/paid` - Mark as paid
- `DELETE /api/splits/:id` - Delete split

### Summary
- `GET /api/summary/current` - Get current month summary
- `GET /api/summary?year=2024&month=12` - Get specific month summary

### Reports
- `POST /api/reports/generate` - Manually generate and email report

## Automated Features

### Monthly Report Scheduler

The application automatically generates and emails monthly expense reports on the 1st of every month at 9:00 AM. The report includes:

- Total income and expenses
- Balance calculation
- Expenses by category
- Unpaid split expenses

## Database Schema

### users
- id (VARCHAR) - Firebase UID
- email (VARCHAR)
- created_at (TIMESTAMP)

### categories
- id (INT)
- name (VARCHAR)

### incomes
- id (INT)
- user_id (VARCHAR)
- amount (DECIMAL)
- source (VARCHAR)
- description (TEXT)
- date (DATE)

### expenses
- id (INT)
- user_id (VARCHAR)
- amount (DECIMAL)
- category_id (INT)
- description (TEXT)
- date (DATE)

### splits
- id (INT)
- user_id (VARCHAR)
- friend_name (VARCHAR)
- amount (DECIMAL)
- description (TEXT)
- is_paid (BOOLEAN)
- date (DATE)

## Gmail SMTP Setup

To use Gmail for sending reports:

1. Enable 2-Factor Authentication on your Google Account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App Passwords
   - Generate a password for "Mail"
3. Use this app password in the `SMTP_PASS` environment variable

## Features Demonstration

### Dashboard
- Real-time balance calculation (Income - Expenses)
- Current month income and expense totals
- Category-wise expense breakdown
- Unpaid split expenses alert

### Income Management
- Add, edit, delete income entries
- Track income source and date
- View complete income history

### Expense Management
- Categorized expense tracking
- 8 default categories (Food, Travel, Rent, etc.)
- Full CRUD operations

### Split Expense Tracking
- Track money owed by friends
- Mark expenses as paid/unpaid
- View total unpaid amount
- Complete payment history

## Future Enhancements

- Mobile application
- Expense analytics and charts
- Budget limits and alerts
- Export data to Excel
- Cloud database support
- Multi-currency support

## License

MIT

## Author

Built with ❤️ for efficient personal finance management
