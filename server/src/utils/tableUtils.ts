import crypto from 'crypto';

/**
 * Sanitizes Firebase UID for use in SQL table names.
 * Uses SHA-256 hash to ensure uniqueness and case-insensitivity safety.
 */
export const sanitizeUid = (uid: string): string => {
    // Create a hash of the UID to ensure it is unique and safe for table names (case insensitive)
    return crypto.createHash('sha256').update(uid).digest('hex').substring(0, 16);
};

/**
 * Generates a user-specific table name.
 */
export const getUserTableName = (uid: string, baseName: string): string => {
    const sUid = sanitizeUid(uid);
    return `user_${sUid}_${baseName}`;
};
