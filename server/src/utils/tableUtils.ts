import crypto from 'crypto';

/**
 * Sanitizes Firebase UID for use in SQL table names.
 * Replaces non-alphanumeric characters with underscores.
 */
export const sanitizeUid = (uid: string): string => {
    // Replace non-alphanumeric characters with underscores and limit length if needed
    // SQL table names can be up to 64 chars, so we should be safe with common UIDs
    return uid.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
};

/**
 * OLD Sanitizer (for migration)
 */
export const getOldSanitizedUid = (uid: string): string => {
    return crypto.createHash('sha256').update(uid).digest('hex').substring(0, 16);
};

/**
 * Generates a user-specific table name.
 */
export const getUserTableName = (uid: string, baseName: string): string => {
    const sUid = sanitizeUid(uid);
    return `user_${sUid}_${baseName}`;
};

/**
 * Generates an OLD user-specific table name (for migration).
 */
export const getOldUserTableName = (uid: string, baseName: string): string => {
    const sUid = getOldSanitizedUid(uid);
    return `user_${sUid}_${baseName}`;
};
