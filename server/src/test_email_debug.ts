import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('--- Email Debug Script ---');
console.log('CWD:', process.cwd());
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER ? '(Set)' : '(Not Set)');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '(Set)' : '(Not Set)');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

async function main() {
    try {
        console.log('Verifying transporter connection...');
        await transporter.verify();
        console.log('Connection verified! Attempting to send mail...');

        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.SMTP_USER, // Send to self
            subject: 'Test Email from Debug Script',
            text: 'If you see this, SMTP is working correctly.',
        });

        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Email Error:', error);
    }
}

main();
