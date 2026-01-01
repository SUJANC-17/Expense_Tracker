/**
 * Sanitizes Firebase UID for use in SQL table names.
 * Table names should typically contain only alphanumeric characters and underscores.
 * Firebase UIDs can contain hyphens, which are not allowed in unquoted table names in some SQL dialects.
 */
export const sanitizeUid = (uid: string): string => {
    return uid.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
};

/**
 * Generates a user-specific table name.
 */
export const getUserTableName = (uid: string, baseName: string): string => {
    const sUid = sanitizeUid(uid);
    return `user_${sUid}_${baseName}`;
};
