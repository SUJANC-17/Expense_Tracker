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
