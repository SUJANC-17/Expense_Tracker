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
const reminderUrl = frontendBaseUrl;

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
    rejectUnauthorized: false,
  },
});

export const sendMonthlyReport = async (
  email: string,
  pdfBuffer: Buffer,
  month: number,
  year: number
): Promise<void> => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const monthName = monthNames[month - 1];

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: `Your ${monthName} ${year} expense report is ready`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1e293b;">
          <h2 style="color: #2563eb; margin-bottom: 12px;">Your monthly report is ready</h2>
          <p>Hello,</p>
          <p>Your expense report for <strong>${monthName} ${year}</strong> is attached to this email.</p>
          <p>Inside the report, you will find:</p>
          <ul>
            <li>A summary of income, expenses, and closing balance</li>
            <li>Expenses grouped by category</li>
            <li>Detailed income and expense entries</li>
            <li>Any unpaid split balances</li>
          </ul>
          <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
            This message was sent automatically by Expense Tracker.
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
      subject: 'New sign-in detected on your Expense Tracker account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #2563eb; color: white; padding: 22px; text-align: center;">
            <h2 style="margin: 0;">Account sign-in alert</h2>
          </div>
          <div style="padding: 30px; color: #1e293b;">
            <p>Hello,</p>
            <p>A sign-in to your Expense Tracker account was just completed.</p>
            <p><strong>Time:</strong> ${loginTime}</p>
            <div style="margin: 20px 0; padding: 16px; border: 1px solid #fecaca; background-color: #fef2f2; border-radius: 10px;">
              <p style="margin: 0 0 10px; font-weight: bold; color: #991b1b;">If this was not you, please secure your account right away.</p>
              <p style="margin: 0; color: #7f1d1d;">
                Use the Forgot Password option in the app to reset your password and protect your account.
              </p>
            </div>
            <p>If you recognise this sign-in, you can safely ignore this email.</p>
            <p style="margin-top: 30px;">Regards,<br>Expense Tracker</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            Automated security message. Please do not reply.
          </div>
        </div>
      `,
    });
    console.log(`Login notification sent to ${email}`);
  } catch (error) {
    console.error('Error sending login notification:', error);
    // Don't throw error to avoid blocking the login flow
  }
};

export const sendOtpEmail = async (
  email: string,
  otp: string,
  purpose: 'signup' | 'password-setup' | 'password-change'
): Promise<void> => {
  const subject =
    purpose === 'signup'
      ? 'Verify your email to create your Expense Tracker account'
      : purpose === 'password-setup'
        ? 'Verify your email to set a password'
        : 'Verify your email to change your password';

  const title =
    purpose === 'signup'
      ? 'Account verification code'
      : purpose === 'password-setup'
        ? 'Set password verification code'
        : 'Change password verification code';

  const intro =
    purpose === 'signup'
      ? 'Enter this code to verify your email address before your account is created.'
      : purpose === 'password-setup'
        ? 'Enter this code to confirm your email before setting a password on this account.'
        : 'Enter this code to confirm your password change request.';

  await transporter.sendMail({
    from: smtpFrom,
    to: email,
    subject,
    html: `
      <div style="margin:0;padding:0;background:#0f172a;">
        <div style="max-width:640px;margin:0 auto;padding:32px 20px;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
          <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border:1px solid rgba(148,163,184,0.2);border-radius:20px;padding:32px;">
            <div style="font-size:14px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">Expense Tracker</div>
            <div style="font-size:28px;font-weight:700;color:#f8fafc;margin-bottom:16px;">${title}</div>
            <p style="font-size:16px;line-height:1.6;color:#cbd5e1;margin:0 0 20px;">${intro}</p>
            <div style="display:inline-block;background:#ffffff;color:#0f172a;font-size:36px;font-weight:800;letter-spacing:0.2em;padding:18px 28px;border-radius:16px;margin:10px 0 22px;">
              ${otp}
            </div>
            <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 10px;">This code is valid for 10 minutes.</p>
            <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0;">If you did not request this code, you can safely ignore this email.</p>
          </div>
        </div>
      </div>
    `,
  });
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
      subject: 'Friendly reminder to log your expenses',
      html: `
        <div style="margin:0;padding:0;background:#0f172a;">
          <div style="max-width:640px;margin:0 auto;padding:32px 20px;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
            <div style="background:linear-gradient(135deg,#111827 0%,#1e293b 100%);border:1px solid rgba(148,163,184,0.2);border-radius:20px;padding:32px;">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
                <div style="width:44px;height:44px;border-radius:12px;background:#22c55e;display:flex;align-items:center;justify-content:center;color:#052e16;font-weight:700;font-size:20px;">E</div>
                <div>
                  <div style="font-size:14px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;">Expense Tracker</div>
                  <div style="font-size:24px;font-weight:700;color:#f8fafc;">Daily expense reminder</div>
                </div>
              </div>
              <p style="font-size:16px;line-height:1.6;color:#cbd5e1;margin:0 0 16px;">Hi ${safeUsername},</p>
              <p style="font-size:16px;line-height:1.6;color:#cbd5e1;margin:0 0 16px;">
                This is your scheduled reminder for <strong style="color:#f8fafc;">${safeReminderTime}</strong>.
                You have not logged any expense for today yet.
              </p>
              <p style="font-size:16px;line-height:1.6;color:#cbd5e1;margin:0 0 24px;">
                You can change the reminder time or turn this off from the profile menu at any time.
              </p>
              <div style="margin:28px 0 18px;">
                <a href="${reminderUrl}" style="display:inline-block;background:#22c55e;color:#052e16;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700;font-size:15px;">
                  Open App
                </a>
              </div>
              <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin:0;">
                If you have already added an expense today, you can ignore this message.
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
      subject: 'Reset your Expense Tracker password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #7c3aed; color: white; padding: 22px; text-align: center;">
            <h2 style="margin: 0;">Password reset request</h2>
          </div>
          <div style="padding: 30px; color: #1e293b;">
            <p>Hello,</p>
            <p>We received a request to reset the password on your Expense Tracker account.</p>
            <p>
              <a href="${resetLink}" style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold;">
                Reset password
              </a>
            </p>
            <p>If the button does not work, copy and paste the link below into your browser:</p>
            <p style="word-break: break-all; color: #4c1d95;">${resetLink}</p>
            <p style="margin-top: 20px; font-weight: bold; color: #7f1d1d;">
              If you did not request this, you can safely ignore this email.
            </p>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            Automated message. Please do not reply.
          </div>
        </div>
      `,
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
      unpaidSplits: data.splits?.filter((s: any) => !s.is_paid).reduce((sum: number, s: any) => sum + Number(s.amount), 0) || 0,
    };

    const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2));

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Your account is scheduled for deletion due to inactivity',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #ef4444; color: white; padding: 22px; text-align: center;">
            <h2 style="margin: 0;">Inactivity notice</h2>
          </div>
          <div style="padding: 30px; color: #1e293b;">
            <p>Hello,</p>
            <p>We have not seen activity on your Expense Tracker account for over <strong>30 days</strong>.</p>
            <p>As part of our data retention policy, your account and associated data are scheduled for removal.</p>

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #475569;">Your account summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Total income:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #22c55e;">Rs.${summary.income.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Total expenses:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ef4444;">Rs.${summary.expenses.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Unpaid split balance:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #f59e0b;">Rs.${summary.unpaidSplits.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <p><strong>Note:</strong> Your data has been removed from the active database. This email is your final export notice.</p>
            <p>If you return later, you can sign in again and create a fresh profile.</p>

            <p style="margin-top: 30px;">Regards,<br>Expense Tracker</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            Automated message.
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'user_data_backup.json',
          content: jsonBuffer,
          contentType: 'application/json',
        },
      ],
    });

    console.log(`Inactivity deletion notice sent to ${email}`);
  } catch (error) {
    console.error('Error sending inactivity notice:', error);
    throw error;
  }
};
