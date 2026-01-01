import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

try {
    admin.initializeApp({
        credential: admin.credential.cert(path.resolve(serviceAccountPath)),
    });
    console.log('Firebase initialized');
} catch (error) {
    console.error('Error initializing Firebase:', error);
}

export default admin;
