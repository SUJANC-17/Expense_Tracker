export const DEFAULT_REMINDER_TIME = '21:00';

export const REMINDER_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidReminderTime = (value: string): boolean => {
    return REMINDER_TIME_PATTERN.test(value);
};

export const normalizeReminderTime = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    return isValidReminderTime(trimmed) ? trimmed : null;
};

export const toBooleanFlag = (value: unknown, defaultValue = true): number => {
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'number') return value ? 1 : 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return 1;
        if (['false', '0', 'no', 'off'].includes(normalized)) return 0;
    }

    return defaultValue ? 1 : 0;
};
