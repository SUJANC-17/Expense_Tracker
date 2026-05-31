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
  'auth/invalid-api-key': 'Authentication is misconfigured. Please contact support.',
  'auth/api-key-not-valid': 'Authentication is misconfigured. Please contact support.',
  'auth/configuration-not-found': 'Authentication is not enabled for this project. Please contact support.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Please contact support.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/account-exists-with-different-credential': 'This email is already registered with a different login method',
  'auth/email-already-in-use': 'This email is already registered with a different login method',
  'auth/credential-already-in-use': 'This email is already registered with a different login method',
  'auth/provider-already-linked': 'This login method is already linked to your account.',
  'auth/requires-recent-login': 'Please sign in again before changing your password.',
  'auth/unauthorized-domain': 'This site is not authorized for Firebase sign-in. Please contact support.',
  'auth/app-deleted': 'Authentication service is unavailable. Please refresh and try again.',
  'auth/invalid-user-token': 'Your session has expired. Please log in again.',
  'auth/user-token-expired': 'Your session has expired. Please log in again.',
  EMAIL_NOT_FOUND: 'No account found with this email. Please sign up.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  OPERATION_NOT_ALLOWED: 'Password reset is not enabled for this project.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many failed attempts. Please try again later.',
  MISMATCH_LOGIN_METHOD: 'This email is already registered with a different login method',
  'Use Change Password for this account': 'This account already has a password. Use Change Password.',
  'Set Password first before changing it': 'Set a password first before you can change it.',
  'Password setup verified': 'Password setup verified.',
};

const API_ERROR_MAP: Array<[RegExp, string]> = [
  [/failed to register user/i, 'Something went wrong. Please try again.'],
  [/failed to send login notification/i, 'Something went wrong. Please try again.'],
  [/this email is already registered with a different login method/i, 'This email is already registered with a different login method'],
  [/please sign up first/i, 'Please sign up first.'],
  [/invalid or expired otp/i, 'The verification code is invalid or expired. Please request a new code.'],
  [/password changes are not available for google accounts/i, 'Password changes are not available for Google accounts.'],
  [/use change password for this account/i, 'This account already has a password. Use Change Password.'],
  [/set a password first before you can change it/i, 'Set a password first before you can change it.'],
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
