import crypto from 'crypto';
import db from '../config/db.js';
import { sendOtpEmail } from './emailService.js';

export type OtpPurpose = 'signup' | 'password-setup' | 'password-change';

export interface OtpChallenge {
  id: string;
  purpose: OtpPurpose;
  email: string;
  username?: string | null;
  uid?: string | null;
  expires_at: string;
  attempts: number;
}

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const sha256 = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const generateOtp = (): string =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

const nowPlusMinutes = (minutes: number): string =>
  `datetime('now', 'localtime', '+${minutes} minutes')`;

export const createOtpChallenge = async (
  purpose: OtpPurpose,
  email: string,
  username?: string,
  uid?: string
): Promise<{ challengeId: string; expiresInMinutes: number }> => {
  const normalizedEmail = email.trim().toLowerCase();
  const challengeId = crypto.randomUUID();
  const otp = generateOtp();
  const salt = crypto.randomBytes(16).toString('hex');
  const otpHash = sha256(`${salt}:${otp}`);

  db.prepare('DELETE FROM auth_otp_challenges WHERE email = ? AND purpose = ?').run(normalizedEmail, purpose);

  db.prepare(
    `INSERT INTO auth_otp_challenges (
      id, purpose, email, username, uid, otp_hash, salt, attempts, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ${nowPlusMinutes(OTP_TTL_MINUTES)})`
  ).run(challengeId, purpose, normalizedEmail, username || null, uid || null, otpHash, salt);

  await sendOtpEmail(normalizedEmail, otp, purpose);

  return { challengeId, expiresInMinutes: OTP_TTL_MINUTES };
};

export const verifyOtpChallenge = (
  challengeId: string,
  email: string,
  purpose: OtpPurpose,
  otp: string
): OtpChallenge | null => {
  const normalizedEmail = email.trim().toLowerCase();
  const challenge = db.prepare(
    `SELECT id, purpose, email, username, uid, otp_hash, salt, attempts, expires_at
     FROM auth_otp_challenges
     WHERE id = ? AND purpose = ? AND email = ?`
  ).get(challengeId, purpose, normalizedEmail) as (OtpChallenge & { otp_hash: string; salt: string }) | undefined;

  if (!challenge) return null;

  const expired = db.prepare(
    `SELECT CASE WHEN datetime('now', 'localtime') > expires_at THEN 1 ELSE 0 END AS expired
     FROM auth_otp_challenges WHERE id = ?`
  ).get(challengeId) as { expired?: number } | undefined;

  if (expired?.expired) {
    db.prepare('DELETE FROM auth_otp_challenges WHERE id = ?').run(challengeId);
    return null;
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    db.prepare('DELETE FROM auth_otp_challenges WHERE id = ?').run(challengeId);
    return null;
  }

  const computedHash = sha256(`${challenge.salt}:${otp}`);
  const isValid = crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(challenge.otp_hash));

  if (!isValid) {
    db.prepare('UPDATE auth_otp_challenges SET attempts = attempts + 1 WHERE id = ?').run(challengeId);
    return null;
  }

  db.prepare('DELETE FROM auth_otp_challenges WHERE id = ?').run(challengeId);
  return challenge;
};
