import cron from 'node-cron';
import pool from '../config/db.js';
import type { RowDataPacket } from 'mysql2/promise';
import { generateMonthlyPDF } from './pdfService.js';
import { sendMonthlyReport } from './emailService.js';
import { getUserTableName } from '../utils/tableUtils.js';

// Schedule to run on the 1st of every month at 9:00 AM
export const startMonthlyReportScheduler = () => {
    cron.schedule('0 9 1 * *', async () => {
        console.log('Running monthly report generation...');

        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        const year = lastMonth.getFullYear();
        const month = lastMonth.getMonth() + 1;

        try {
            // Get all users
            const [users] = await pool.query<RowDataPacket[]>('SELECT id, email FROM users');

            for (const user of users) {
                try {
                    await generateAndSendReport(user.id, user.email, year, month);
                } catch (error) {
                    console.error(`Failed to generate report for user ${user.email}:`, error);
                }
            }

            console.log('Monthly reports sent successfully');
        } catch (error) {
            console.error('Error in monthly report scheduler:', error);
        }
    });

    console.log('Monthly report scheduler started');
};

// Manual trigger for testing
export const generateAndSendReport = async (
    userId: string,
    userEmail: string,
    year: number,
    month: number
): Promise<void> => {
    const incomeTable = getUserTableName(userId, 'incomes');
    const expenseTable = getUserTableName(userId, 'expenses');
    const splitTable = getUserTableName(userId, 'splits');

    // Get total income
    const [incomeRows] = await pool.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(amount), 0) as total_income 
         FROM \`${incomeTable}\` 
         WHERE YEAR(date) = ? AND MONTH(date) = ?`,
        [year, month]
    );

    // Get detailed income records
    const [incomeDetails] = await pool.query<RowDataPacket[]>(
        `SELECT amount, source, description, date 
         FROM \`${incomeTable}\` 
         WHERE YEAR(date) = ? AND MONTH(date) = ?
         ORDER BY date DESC`,
        [year, month]
    );

    // Get total expenses
    const [expenseRows] = await pool.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(amount), 0) as total_expense 
         FROM \`${expenseTable}\` 
         WHERE YEAR(date) = ? AND MONTH(date) = ?`,
        [year, month]
    );

    // Get detailed expense records
    const [expenseDetails] = await pool.query<RowDataPacket[]>(
        `SELECT e.amount, c.name as category, e.description, e.date 
         FROM \`${expenseTable}\` e 
         JOIN categories c ON e.category_id = c.id 
         WHERE YEAR(e.date) = ? AND MONTH(e.date) = ?
         ORDER BY e.date DESC`,
        [year, month]
    );

    // Get expenses by category
    const [categoryRows] = await pool.query<RowDataPacket[]>(
        `SELECT c.name as category, COALESCE(SUM(e.amount), 0) as total 
         FROM \`${expenseTable}\` e 
         JOIN categories c ON e.category_id = c.id 
         WHERE YEAR(e.date) = ? AND MONTH(e.date) = ? 
         GROUP BY c.name`,
        [year, month]
    );

    // Get income from settled splits for the month (Repayments)
    const [splitIncomeRows] = await pool.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(amount), 0) as total_split_income 
         FROM \`${splitTable}\` 
         WHERE is_paid = TRUE AND YEAR(paid_at) = ? AND MONTH(paid_at) = ?`,
        [year, month]
    );

    // Get total upfront splits created in the month (Outgoing money)
    const [splitExpenseRows] = await pool.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(amount), 0) as total_split_expense 
         FROM \`${splitTable}\` 
         WHERE YEAR(date) = ? AND MONTH(date) = ?`,
        [year, month]
    );

    // Get unpaid splits total
    const [unpaidSplitsRows] = await pool.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(amount), 0) as total_unpaid 
         FROM \`${splitTable}\` 
         WHERE is_paid = FALSE`
    );

    // Get detailed unpaid splits
    const [unpaidSplitsDetails] = await pool.query<RowDataPacket[]>(
        `SELECT friend_name, amount, description, date 
         FROM \`${splitTable}\` 
         WHERE is_paid = FALSE
         ORDER BY date DESC`
    );

    const baseIncome = Number(incomeRows[0]?.total_income || 0);
    const splitRepayments = Number(splitIncomeRows[0]?.total_split_income || 0);
    const baseExpense = Number(expenseRows[0]?.total_expense || 0);
    const upfrontSplits = Number(splitExpenseRows[0]?.total_split_expense || 0);

    const totalIncome = baseIncome;
    const totalExpense = baseExpense + upfrontSplits;
    const balance = totalIncome - totalExpense + splitRepayments;
    const totalUnpaid = Number(unpaidSplitsRows[0]?.total_unpaid || 0);

    const reportData = {
        year,
        month,
        total_income: totalIncome,
        total_expense: totalExpense,
        balance,
        expenses_by_category: categoryRows as Array<{ category: string; total: number }>,
        total_unpaid_splits: totalUnpaid,
        user_email: userEmail,
        incomes: incomeDetails as Array<{ amount: number; source: string; description: string; date: string }>,
        expenses: expenseDetails as Array<{ amount: number; category: string; description: string; date: string }>,
        unpaid_splits: unpaidSplitsDetails as Array<{ friend_name: string; amount: number; description: string; date: string }>
    };

    // Generate PDF
    const pdfBuffer = await generateMonthlyPDF(reportData);

    // Send email
    await sendMonthlyReport(userEmail, pdfBuffer, month, year);
};
