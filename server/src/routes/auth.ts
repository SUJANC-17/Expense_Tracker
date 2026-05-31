import express from 'express';
import admin from '../config/firebase.js';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { createUserTables } from '../models/userSchema.js';
import { sendLoginNotification } from '../services/emailService.js';
import { createOtpChallenge, verifyOtpChallenge } from '../services/authOtpService.js';

const router = express.Router();

const MISMATCH_ERROR = 'This email is already registered with a different login method';

const normalizeEmail = (value: unknown): string => String(value || '').trim().toLowerCase();

const getExistingUserByEmail = (email: string): any | undefined => db.prepare('SELECT * FROM users WHERE email = ?').get(email);
const getExistingUserByUid = (uid: string): any | undefined => db.prepare('SELECT * FROM users WHERE id = ?').get(uid);

const providerIdsFromFirebaseUser = (firebaseUser: any): string[] => {
  return (firebaseUser?.providerData || [])
    .map((provider: any) => provider?.providerId)
    .filter(Boolean);
};

const authMethodsFromProviders = (providers: string[]): string => providers.length ? providers.join(',') : 'password';

const getFirebaseUser = async (uid: string) => admin.auth().getUser(uid);

const upsertUserFromAuth = (
  uid: string,
  email: string,
  username: string | null | undefined,
  providerIds: string[],
  photoUrl?: string | null
) => {
  const normalizedEmail = normalizeEmail(email);
  const existing = db.prepare('SELECT * FROM users WHERE id = ? OR email = ?').get(uid, normalizedEmail) as any;
  const authProvider = authMethodsFromProviders(providerIds);

  if (existing) {
    db.prepare(
      `UPDATE users
      SET id = ?,
           username = COALESCE(?, username),
           email = ?,
           auth_provider = ?,
           photo_url = COALESCE(?, photo_url),
           last_active_at = DATETIME('now', 'localtime')
      WHERE id = ? OR email = ?`
    ).run(uid, username || null, normalizedEmail, authProvider, photoUrl || null, existing.id || uid, normalizedEmail);
    createUserTables(uid);
    return db.prepare('SELECT id, username, email, auth_provider, photo_url, created_at, reminder_enabled, reminder_time FROM users WHERE id = ?').get(uid);
  }

  db.prepare(
    `INSERT INTO users (id, username, email, auth_provider, photo_url)
     VALUES (?, ?, ?, ?, ?)`
  ).run(uid, username || normalizedEmail.split('@')[0] || null, normalizedEmail, authProvider, photoUrl || null);
  createUserTables(uid);
  return db.prepare('SELECT id, username, email, auth_provider, photo_url, created_at, reminder_enabled, reminder_time FROM users WHERE id = ?').get(uid);
};

router.post('/signup/request-otp', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const email = normalizeEmail(req.body?.email);

    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const existing = getExistingUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: MISMATCH_ERROR });
      return;
    }

    const challenge = await createOtpChallenge('signup', email, username);
    res.status(201).json({
      message: 'OTP sent',
      challengeId: challenge.challengeId,
      expiresInMinutes: challenge.expiresInMinutes,
    });
  } catch (error) {
    console.error('Error creating signup OTP:', error);
    res.status(500).json({ error: 'Failed to send signup OTP' });
  }
});

router.post('/signup/verify-otp', async (req, res) => {
  try {
    const challengeId = String(req.body?.challengeId || '').trim();
    const email = normalizeEmail(req.body?.email);
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const otp = String(req.body?.otp || '').trim();

    if (!challengeId || !email || !username || !password || !otp) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const challenge = verifyOtpChallenge(challengeId, email, 'signup', otp);
    if (!challenge) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const existing = getExistingUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: MISMATCH_ERROR });
      return;
    }

    const created = await admin.auth().createUser({
      email,
      password,
      displayName: username,
    });

    const user = upsertUserFromAuth(created.uid, email, username, ['password'], created.photoURL || null);
    res.status(201).json({ message: 'Account created', user });
  } catch (error: any) {
    if (error?.code === 'auth/email-already-exists') {
      res.status(409).json({ error: MISMATCH_ERROR });
      return;
    }
    console.error('Error verifying signup OTP:', error);
    const status = error?.status || 500;
    res.status(status).json({ error: error?.message || 'Failed to create account' });
  }
});

router.post('/password-setup/request-otp', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const firebaseUser = await getFirebaseUser(uid);
    const providers = providerIdsFromFirebaseUser(firebaseUser);
    if (providers.includes('password')) {
      res.status(400).json({ error: 'Use Change Password for this account' });
      return;
    }

    const email = normalizeEmail(firebaseUser.email || req.user?.email || '');
    if (!email) {
      res.status(400).json({ error: 'Email address is missing from your Firebase account' });
      return;
    }

    const challenge = await createOtpChallenge(
      'password-setup',
      email,
      firebaseUser.displayName || email.split('@')[0] || undefined,
      uid
    );
    res.status(201).json({
      message: 'OTP sent',
      challengeId: challenge.challengeId,
      expiresInMinutes: challenge.expiresInMinutes,
    });
  } catch (error) {
    console.error('Error creating password setup OTP:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send verification code' });
  }
});

router.post('/password-setup/verify-otp', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const firebaseUser = await getFirebaseUser(uid);
    const challengeId = String(req.body?.challengeId || '').trim();
    const otp = String(req.body?.otp || '').trim();

    if (!challengeId || !otp) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const email = normalizeEmail(firebaseUser.email || req.user?.email || '');
    if (!email) {
      res.status(400).json({ error: 'Email address is missing from your Firebase account' });
      return;
    }

    const challenge = verifyOtpChallenge(challengeId, email, 'password-setup', otp);
    if (!challenge) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    res.json({ message: 'Password setup verified' });
  } catch (error) {
    console.error('Error verifying password setup OTP:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

router.post('/password-change/request-otp', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const firebaseUser = await getFirebaseUser(uid);
    const providers = providerIdsFromFirebaseUser(firebaseUser);
    if (!providers.includes('password')) {
      res.status(400).json({ error: 'Set Password first before changing it' });
      return;
    }

    const email = normalizeEmail(firebaseUser.email || req.user?.email || '');
    if (!email) {
      res.status(400).json({ error: 'Email address is missing from your Firebase account' });
      return;
    }

    const challenge = await createOtpChallenge(
      'password-change',
      email,
      firebaseUser.displayName || email.split('@')[0] || undefined,
      uid
    );
    res.status(201).json({
      message: 'OTP sent',
      challengeId: challenge.challengeId,
      expiresInMinutes: challenge.expiresInMinutes,
    });
  } catch (error) {
    console.error('Error creating password change OTP:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send verification code' });
  }
});

router.post('/password-change/verify-otp', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const firebaseUser = await getFirebaseUser(uid);
    const challengeId = String(req.body?.challengeId || '').trim();
    const otp = String(req.body?.otp || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!challengeId || !otp || !newPassword) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const email = normalizeEmail(firebaseUser.email || req.user?.email || '');
    if (!email) {
      res.status(400).json({ error: 'Email address is missing from your Firebase account' });
      return;
    }

    const challenge = verifyOtpChallenge(challengeId, email, 'password-change', otp);
    if (!challenge) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    await admin.auth().updateUser(uid, { password: newPassword });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error verifying password change OTP:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Register or get user
router.post('/register', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { uid, email } = req.user!;
    const { username, photoURL, allowCreate } = req.body ?? {};
    const canCreate = Boolean(allowCreate);

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const firebaseUser = await getFirebaseUser(uid);
    const providers = providerIdsFromFirebaseUser(firebaseUser);
    const existing = getExistingUserByUid(uid) || (email ? getExistingUserByEmail(email) : undefined);

    if (!existing && !canCreate) {
      res.status(403).json({ error: 'Please sign up first.' });
      return;
    }

    const user = upsertUserFromAuth(
      uid,
      email,
      typeof username === 'string' ? username.trim() : null,
      providers.length > 0 ? providers : ['password'],
      typeof photoURL === 'string' ? photoURL : null
    );

    res.json({ message: 'User authenticated', user });
  } catch (error: any) {
    console.error('Error registering user:', error);
    const status = error?.status || 500;
    res.status(status).json({ error: error?.message || 'Failed to register user' });
  }
});

// Confirm login and send notification email after a successful authenticated sign-in
router.post('/login', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { uid, email } = req.user!;
    const userRow = db.prepare('SELECT email FROM users WHERE id = ? OR email = ?').get(uid, email || null) as any;
    const targetEmail = email || userRow?.email;

    if (targetEmail) {
      await sendLoginNotification(targetEmail);
    }

    res.json({
      message: 'Login confirmed',
      notificationSent: Boolean(targetEmail),
    });
  } catch (error) {
    console.error('Error sending login notification:', error);
    res.status(500).json({ error: 'Failed to send login notification' });
  }
});

router.post('/delete-account', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { uid } = req.user!;

    db.transaction(() => {
      db.prepare('DELETE FROM auth_otp_challenges WHERE uid = ?').run(uid);
      db.prepare('DELETE FROM splits WHERE user_id = ?').run(uid);
      db.prepare('DELETE FROM expenses WHERE user_id = ?').run(uid);
      db.prepare('DELETE FROM incomes WHERE user_id = ?').run(uid);
      db.prepare('DELETE FROM friends WHERE user_id = ?').run(uid);
      db.prepare('DELETE FROM users WHERE id = ?').run(uid);
    })();

    await admin.auth().deleteUser(uid).catch((error: any) => {
      if (error?.code !== 'auth/user-not-found') throw error;
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Send password reset email through Firebase Auth REST API using the public Web API key
router.post('/password-reset', async (req, res) => {
    const { email, apiKey } = req.body ?? {};
    const firebaseApiKey = typeof apiKey === 'string' && apiKey.trim()
        ? apiKey.trim()
        : process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;

    if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Email is required' });
        return;
    }

    if (!firebaseApiKey) {
        res.status(500).json({ error: 'Firebase Web API key is not configured on the server.' });
        return;
    }

    try {
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Firebase-Locale': 'en',
            },
            body: JSON.stringify({
                requestType: 'PASSWORD_RESET',
                email: email.trim(),
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const code = String(data?.error?.message || data?.error?.errors?.[0]?.message || '');
            if (code === 'EMAIL_NOT_FOUND') {
                res.status(404).json({ error: 'No account found with this email. Please sign up.' });
                return;
            }
            if (code === 'INVALID_EMAIL') {
                res.status(400).json({ error: 'Please enter a valid email address.' });
                return;
            }
            if (code === 'OPERATION_NOT_ALLOWED') {
                res.status(400).json({ error: 'Password reset is not enabled for this project.' });
                return;
            }

            console.error('Firebase REST password reset failed:', data);
            res.status(500).json({ error: 'Failed to send password reset email' });
            return;
        }

        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error('Error sending password reset email:', error);
        res.status(500).json({ error: 'Failed to send password reset email' });
    }
});

export default router;
