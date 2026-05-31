import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
const frontendBaseUrl = (
  process.env.APP_FRONTEND_URL ||
  process.env.PUBLIC_APP_URL ||
  process.env.FRONTEND_URL ||
  'https://expensetrack.qzz.io'
).replace(/\/$/, '');
const settingsUrl = `${frontendBaseUrl}/?tab=settings`;

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpSecure,
  requireTLS: !smtpSecure,
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export const sendMonthlyReport = async (
  email: string,
  pdfBuffer: Buffer,
  month: number,
  year: number
): Promise<void> => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthName = monthNames[month - 1];

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: `Monthly Expense Report - ${monthName} ${year}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Monthly Expense Report</h2>
          <p>Hello,</p>
          <p>Please find attached your expense report for <strong>${monthName} ${year}</strong>.</p>
          <p>This report includes:</p>
          <ul>
            <li>Total Income and Expenses</li>
            <li>Balance Summary</li>
            <li>Expenses by Category</li>
            <li>Unpaid Split Expenses</li>
          </ul>
          <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
            This is an automated email from Expense Tracker App.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `expense-report-${monthName}-${year}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    console.log(`Monthly report sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const sendLoginNotification = async (email: string): Promise<void> => {
  try {
    const loginTime = new Date().toLocaleString();
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Expense Tracker Login Notification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Expense Tracker Login Alert</h2>
          </div>
          <div style="padding: 30px; color: #1e293b;">
            <p>Hello,</p>
            <p>A login to your Expense Tracker account was just confirmed.</p>
            <p><strong>Login time:</strong> ${loginTime}</p>
            <div style="margin: 20px 0; padding: 16px; border: 1px solid #fecaca; background-color: #fef2f2; border-radius: 8px;">
              <p style="margin: 0 0 10px; font-weight: bold; color: #991b1b;">If you did not make this login, your account may be compromised.</p>
              <p style="margin: 0 0 10px; color: #7f1d1d;">Please reset your password immediately using the Forgot Password option on the login screen.</p>
              <p style="margin: 0; color: #7f1d1d;">
                If possible, return to the app and use the Forgot Password link to send a reset email to your registered address.
              </p>
            </div>
            <p>If you did not initiate this login, please contact support immediately and secure your account.</p>
            <p style="margin-top: 30px;">Best regards,<br>The Expense Tracker Team</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            This is an automated system notification. Please do not reply.
          </div>
        </div>
      `
    });
    console.log(`Login notification sent to ${email}`);
  } catch (error) {
    console.error('Error sending login notification:', error);
    // Don't throw error to avoid blocking the login flow
  }
};

export const sendDailyReminderEmail = async (
  email: string,
  username: string,
  reminderTime: string
): Promise<void> => {
  try {
    const safeUsername = escapeHtml(username || 'there');
    const safeReminderTime = escapeHtml(reminderTime);
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'ExpenseTrack Daily Reminder',
      html: `
        <div style="margin:0;padding:0;background:#0f172a;">
          <div style="max-width:640px;margin:0 auto;padding:32px 20px;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
            <div style="background:linear-gradient(135deg,#111827 0%,#1e293b 100%);border:1px solid rgba(148,163,184,0.2);border-radius:20px;padding:32px;">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
                <div style="width:44px;height:44px;border-radius:12px;background:#22c55e;display:flex;align-items:center;justify-content:center;color:#052e16;font-weight:700;font-size:20px;">E</div>
                <div>
                  <div style="font-size:14px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;">ExpenseTrack</div>
                  <div style="font-size:24px;font-weight:700;color:#f8fafc;">Daily reminder</div>
                </div>
              </div>
              <p style="font-size:16px;line-height:1.6;color:#cbd5e1;margin:0 0 16px;">Hi ${safeUsername},</p>
              <p style="font-size:16px;line-height:1.6;color:#cbd5e1;margin:0 0 16px;">
                It&apos;s your scheduled reminder at <strong style="color:#f8fafc;">${safeReminderTime}</strong>.
                You haven&apos;t logged any expense today yet.
              </p>
              <p style="font-size:16px;line-height:1.6;color:#cbd5e1;margin:0 0 24px;">
                Open your settings to change reminder time or disable this message whenever you want.
              </p>
              <div style="margin:28px 0 18px;">
                <a href="${settingsUrl}" style="display:inline-block;background:#22c55e;color:#052e16;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700;font-size:15px;">
                  Open Reminder Settings
                </a>
              </div>
              <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin:0;">
                If you already logged an expense, you can ignore this email.
              </p>
            </div>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error sending daily reminder email:', error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email: string, resetLink: string): Promise<void> => {
  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Expense Tracker Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #7c3aed; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Expense Tracker Password Reset</h2>
          </div>
          <div style="padding: 30px; color: #1e293b;">
            <p>Hello,</p>
            <p>We received a request to reset your Expense Tracker password.</p>
            <p>
              <a href="${resetLink}" style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold;">
                Reset Your Password
              </a>
            </p>
            <p>If the button does not work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4c1d95;">${resetLink}</p>
            <p style="margin-top: 20px; font-weight: bold; color: #7f1d1d;">
              If you did not request this reset, you can safely ignore this email.
            </p>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            This is an automated system notification. Please do not reply.
          </div>
        </div>
      `
    });
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

export const sendInactivityDeletionNotice = async (
  email: string,
  data: any // Full data object
): Promise<void> => {
  try {
    const summary = {
      income: data.incomes?.reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0,
      expenses: data.expenses?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0,
      unpaidSplits: data.splits?.filter((s: any) => !s.is_paid).reduce((sum: number, s: any) => sum + Number(s.amount), 0) || 0
    };

    const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2));

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Account Data Deletion Notice - 30 Days Inactivity',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Account Inactivity Notice</h2>
          </div>
          <div style="padding: 30px; color: #1e293b;">
            <p>Hello,</p>
            <p>We noticed you haven't used your Expense Tracker account for over <strong>30 days</strong>. As per our data retention policy, we are preparing to delete your account and all associated data to save resources.</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #475569;">Your Data Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Total Income Recorded:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #22c55e;">₹${summary.income.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Total Expenses Recorded:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ef4444;">₹${summary.expenses.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Unpaid Split Balance:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #f59e0b;">₹${summary.unpaidSplits.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <p><strong>Note:</strong> Your data has been wiped from our active databases. This email serves as your final data export.</p>
            <p>If you wish to use the app again, you can simply log in with your Google account, and a fresh profile will be created for you.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>The Expense Tracker Team</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            This is an automated system notification.
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'user_data_backup.json',
          content: jsonBuffer,
          contentType: 'application/json'
        }
      ]
    });

    console.log(`Inactivity deletion notice sent to ${email}`);
  } catch (error) {
    console.error('Error sending inactivity notice:', error);
    throw error;
  }
};
