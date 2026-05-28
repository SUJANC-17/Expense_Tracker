import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const resolvedPath = path.resolve(serviceAccountPath);

if (fs.existsSync(resolvedPath)) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(resolvedPath),
        });
        console.log('Firebase initialized');
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
} else {
    console.warn(
        `Firebase service account not found at ${resolvedPath}. ` +
        'Place firebase-service-account.json in server/ (see .env.example). Auth API routes will fail until configured.'
    );
}

export default admin;
