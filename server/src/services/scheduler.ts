import cron from 'node-cron';
import db from '../config/db.js';
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
            const users = db.prepare('SELECT id, email FROM users').all() as any[];

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

    const yearStr = year.toString();
    const monthStr = month.toString().padStart(2, '0');

    // Get total income
    const incomeRows = db.prepare(
        `SELECT COALESCE(SUM(amount), 0) as total_income 
         FROM \`${incomeTable}\` 
         WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
    ).get(yearStr, monthStr) as any;

    // Get detailed income records
    const incomeDetails = db.prepare(
        `SELECT amount, source, description, date 
         FROM \`${incomeTable}\` 
         WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?
         ORDER BY date DESC`
    ).all(yearStr, monthStr) as any[];

    // Get total expenses
    const expenseRows = db.prepare(
        `SELECT COALESCE(SUM(amount), 0) as total_expense 
         FROM \`${expenseTable}\` 
         WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
    ).get(yearStr, monthStr) as any;

    // Get detailed expense records
    const expenseDetails = db.prepare(
        `SELECT e.amount, c.name as category, e.description, e.date 
         FROM \`${expenseTable}\` e 
         JOIN categories c ON e.category_id = c.id 
         WHERE strftime('%Y', e.date) = ? AND strftime('%m', e.date) = ?
         ORDER BY e.date DESC`
    ).all(yearStr, monthStr) as any[];

    // Get expenses by category
    const categoryRows = db.prepare(
        `SELECT c.name as category, COALESCE(SUM(e.amount), 0) as total 
         FROM \`${expenseTable}\` e 
         JOIN categories c ON e.category_id = c.id 
         WHERE strftime('%Y', e.date) = ? AND strftime('%m', e.date) = ? 
         GROUP BY c.name`
    ).all(yearStr, monthStr) as any[];

    // Get income from settled splits for the month (Repayments)
    const splitIncomeRows = db.prepare(
        `SELECT COALESCE(SUM(amount), 0) as total_split_income 
         FROM \`${splitTable}\` 
         WHERE is_paid = 1 AND strftime('%Y', paid_at) = ? AND strftime('%m', paid_at) = ?`
    ).get(yearStr, monthStr) as any;

    // Get total upfront splits created in the month (Outgoing money)
    const splitExpenseRows = db.prepare(
        `SELECT COALESCE(SUM(amount), 0) as total_split_expense 
         FROM \`${splitTable}\` 
         WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`
    ).get(yearStr, monthStr) as any;

    // Get unpaid splits total
    const unpaidSplitsRows = db.prepare(
        `SELECT COALESCE(SUM(amount), 0) as total_unpaid 
         FROM \`${splitTable}\` 
         WHERE is_paid = 0`
    ).get() as any;

    // Get detailed unpaid splits
    const unpaidSplitsDetails = db.prepare(
        `SELECT friend_name, amount, description, date 
         FROM \`${splitTable}\` 
         WHERE is_paid = 0
         ORDER BY date DESC`
    ).all() as any[];

    const baseIncome = Number(incomeRows?.total_income || 0);
    const splitRepayments = Number(splitIncomeRows?.total_split_income || 0);
    const baseExpense = Number(expenseRows?.total_expense || 0);
    const upfrontSplits = Number(splitExpenseRows?.total_split_expense || 0);

    const totalIncome = baseIncome;
    const totalExpense = baseExpense + upfrontSplits;
    const balance = totalIncome - totalExpense + splitRepayments;
    const totalUnpaid = Number(unpaidSplitsRows?.total_unpaid || 0);

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
