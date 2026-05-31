import cron from 'node-cron';
import db from '../config/db.js';
import { sendDailyReminderEmail } from './emailService.js';
import { DEFAULT_REMINDER_TIME } from '../utils/reminder.js';

const getCurrentLocalDateTime = (): { currentTime: string; currentDate: string } => {
    const row = db.prepare(
        "SELECT strftime('%H:%M', 'now', 'localtime') AS currentTime, date('now', 'localtime') AS currentDate"
    ).get() as any;

    return {
        currentTime: row?.currentTime || DEFAULT_REMINDER_TIME,
        currentDate: row?.currentDate || new Date().toISOString().slice(0, 10),
    };
};

const userHasExpenseToday = (userId: string, currentDate: string): boolean => {
    const row = db.prepare(
        'SELECT 1 FROM expenses WHERE user_id = ? AND date = ? LIMIT 1'
    ).get(userId, currentDate);

    return Boolean(row);
};

export const processDailyReminders = async (): Promise<void> => {
    const { currentTime, currentDate } = getCurrentLocalDateTime();
    const users = db.prepare(
        `SELECT
            id,
            email,
            COALESCE(username, email, 'ExpenseTrack user') AS username,
            COALESCE(reminder_enabled, 1) AS reminder_enabled,
            COALESCE(reminder_time, ?) AS reminder_time
         FROM users
         WHERE COALESCE(reminder_enabled, 1) = 1
           AND COALESCE(reminder_time, ?) = ?`
    ).all(DEFAULT_REMINDER_TIME, DEFAULT_REMINDER_TIME, currentTime) as any[];

    if (users.length === 0) {
        return;
    }

    for (const user of users) {
        if (!user.email) continue;
        if (userHasExpenseToday(user.id, currentDate)) {
            console.log(`[Reminder] Skipping ${user.email}: expense already logged for ${currentDate}`);
            continue;
        }

        try {
            await sendDailyReminderEmail(user.email, String(user.username || user.email), user.reminder_time || currentTime);
            console.log(`[Reminder] Sent daily reminder to ${user.email}`);
        } catch (error) {
            console.error(`[Reminder] Failed to send reminder to ${user.email}:`, error);
        }
    }
};

export const startDailyReminderScheduler = (): void => {
    cron.schedule('* * * * *', async () => {
        try {
            await processDailyReminders();
        } catch (error) {
            console.error('Error in daily reminder scheduler:', error);
        }
    });

    console.log('Daily reminder scheduler started');
};
