import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (projectId && clientEmail && privateKey) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
        });
        console.log('Firebase initialized from environment variables');
    } catch (error) {
        console.error('Error initializing Firebase Admin SDK from environment variables:', error);
    }
} else {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
    const resolvedPath = path.resolve(serviceAccountPath);

    if (fs.existsSync(resolvedPath)) {
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('Firebase initialized from service account file');
        } catch (error) {
            console.error(
                'Error initializing Firebase Admin SDK from file. ' +
                'Make sure the service-account JSON is valid, the key has not been revoked, ' +
                'and the server clock is correct.',
                error
            );
        }
    } else {
        console.warn(
            `Firebase credentials missing: environment variables not set and service account not found at ${resolvedPath}. ` +
            'Auth API routes will fail until configured.'
        );
    }
}

export default admin;
