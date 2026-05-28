import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
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
      from: process.env.SMTP_USER,
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
      from: process.env.SMTP_USER,
      to: email,
      subject: 'New Login to Expense Tracker',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">New Login Detected</h2>
          </div>
          <div style="padding: 30px; color: #1e293b;">
            <p>Hello,</p>
            <p>You have successfully logged into the Expense Tracker app.</p>
            <p><strong>Time:</strong> ${loginTime}</p>
            <p>If this was you, you can safely ignore this email. If you did not log in, please secure your Google account immediately.</p>
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
      from: process.env.SMTP_USER,
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
