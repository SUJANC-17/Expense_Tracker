type AuthErrorLike = {
  code?: string;
  message?: string;
};

const ERROR_MAP: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/wrong-password': 'Incorrect email or password. Please try again.',
  'auth/user-not-found': 'No account found with this email. Please sign up.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/invalid-email': 'Please enter a valid email address.',
  EMAIL_NOT_FOUND: 'No account found with this email. Please sign up.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  OPERATION_NOT_ALLOWED: 'Password reset is not enabled for this project.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many failed attempts. Please try again later.',
};

const API_ERROR_MAP: Array<[RegExp, string]> = [
  [/failed to register user/i, 'Something went wrong. Please try again.'],
  [/failed to send login notification/i, 'Something went wrong. Please try again.'],
  [/api error/i, 'Something went wrong. Please try again.'],
];

const FRIENDLY_MESSAGES = new Set([
  ...Object.values(ERROR_MAP),
  ...API_ERROR_MAP.map(([, friendly]) => friendly),
  'Something went wrong. Please try again.',
]);

export function getFriendlyAuthError(error: unknown): string {
  const authError = error as AuthErrorLike;
  const code = authError?.code;
  if (code && ERROR_MAP[code]) return ERROR_MAP[code];

  const message = (authError?.message || '').trim();
  if (!message) return 'Something went wrong. Please try again.';

  if (FRIENDLY_MESSAGES.has(message)) return message;

  for (const [pattern, friendly] of API_ERROR_MAP) {
    if (pattern.test(message)) return friendly;
  }

  const firebaseCode = message.match(/auth\/[a-z-]+/i)?.[0]?.toLowerCase();
  if (firebaseCode && ERROR_MAP[firebaseCode]) return ERROR_MAP[firebaseCode];

  return 'Something went wrong. Please try again.';
}

export function getFriendlyResetError(error: unknown): string {
  return getFriendlyAuthError(error);
}
