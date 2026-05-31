import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const resolvedPath = path.resolve(serviceAccountPath);

if (fs.existsSync(resolvedPath)) {
    try {
        const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase initialized');
    } catch (error) {
        console.error(
            'Error initializing Firebase Admin SDK. ' +
            'Make sure the service-account JSON is valid, the key has not been revoked, ' +
            'and the server clock is correct.',
            error
        );
    }
} else {
    console.warn(
        `Firebase service account not found at ${resolvedPath}. ` +
        'Place firebase-service-account.json in server/ (see .env.example). Auth API routes will fail until configured.'
    );
}

export default admin;
