# Software Requirements Specification (SRS)
## Expense Tracker Application

### 1. Introduction
**1.1 Purpose**
The purpose of this document is to define the functional and non-functional requirements for the "Expense Tracker" web application. This application aims to help users manage their personal finances by tracking incomes, expenses, and shared costs with friends, providing visual insights and downloadable reports.

**1.2 Scope**
The Expense Tracker is a full-stack web application that allows users to:
- Securely log in and manage their profile.
- Record daily financial transactions (Income/Expenses).
- Manage shared expenses ("Splits") with friends.
- Visualize spending habits through a dashboard.
- Generate monthly financial reports in PDF format.
- Ensure data privacy with user-isolated database tables.

---

### 2. Technology Stack
- **Frontend**: React (TypeScript), Vite, Vanilla CSS (with Glassmorphism design).
- **Backend**: Node.js, Express.js (TypeScript).
- **Database**: MySQL (Relational, using per-user table isolation).
- **Authentication**: Firebase Authentication (Google Sign-In & Email/Password).
- **Hosting/Tunneling**: Ngrok (for local exposure).
- **Libraries**: `pdfkit` (Reporting), `node-cron` (Scheduled tasks).

---

### 3. Functional Requirements

#### 3.1 User Authentication & Management
- **FR-01**: The system must allow users to sign up and log in using Google OAuth or Email/Password via Firebase.
- **FR-02**: The system must verify the authentication token on every API request.
- **FR-03**: The system must automatically track the "Last Active" timestamp for every user action.
- **FR-04**: The system must effectively delete all user data (tables and account) if the user remains inactive for more than 1 month (30 days).

#### 3.2 Transaction Management
- **FR-05**: Users shall be able to add, edit, and delete **Income** records (Date, Source, Description, Amount).
- **FR-06**: Users shall be able to add, edit, and delete **Expense** records (Date, Category, Description, Amount).
- **FR-07**: Expenses must be categorized into one of the standardized categories: *Food, Travel, Bills & Utilities, Entertainment, Health, Shopping, Split, Education*.
- **FR-08**: The system must support negative values for adjustments/refunds.

#### 3.3 Friend & Split Management
- **FR-09**: Users can add friends to their profile.
- **FR-10**: Users can create "Split" transactions where an expense is shared with a friend.
- **FR-11**: The system must calculate and display a specific "Amount Owed" or "owed to" balance for shared expenses.
- **FR-12**: Settlement of splits should update the net balance calculations accordingly.

#### 3.4 Dashboard & Visualization
- **FR-13**: The Dashboard must provide a high-level summary: Total Income, Total Expense, Net Balance, and Lifetime Balance.
- **FR-14**: The Dashboard must display a breakdown of expenses by category.
- **FR-15**: Users must be able to filter dashboard data by Month and Year.
- **FR-16**: The UI must be fully responsive, supporting Desktop, Tablet, and Mobile devices (with sticky headers and touch-optimized targets).

#### 3.5 Reporting
- **FR-17**: The system must generate a PDF Report for any selected month.
- **FR-18**: The PDF report must include:
    - Financial Summary (Income/Expense/Balance cards).
    - Category-wise breakdown table.
    - Detailed transaction logs for Income, Expenses, and Unpaid Splits.
- **FR-19**: The PDF must correctly format currency as "Rs." and ensure proper paging/alignment.

---

### 4. Non-Functional Requirements

#### 4.1 Security
- **NFR-01**: All API endpoints must be protected via JWT (Firebase ID Tokens).
- **NFR-02**: User data must be logically isolated (e.g., specific tables like `expenses_<uid>`) to prevent data leakage between users.

#### 4.2 Performance
- **NFR-03**: The Dashboard should load summary data in under 2 seconds.
- **NFR-04**: Database connections should be pooled to handle concurrent requests efficiently.

#### 4.3 Usability
- **NFR-05**: The interface must feature a modern, "Glassmorphism" aesthetic.
- **NFR-06**: Interactive elements (buttons, inputs) must have a minimum height of 44px on mobile devices for accessibility.

#### 4.4 Reliability
- **NFR-07**: The "Inactive User Cleanup" job must run automatically once every 24 hours (Cron Job) to maintain database hygiene.
