import { useState, type FormEvent } from 'react';
import { apiClient } from '../utils/api';
import { getFriendlyAuthError, getFriendlyResetError } from '../utils/authErrors';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { DollarSign, CheckSquare, Square, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { PrivacyPolicy } from './PrivacyPolicy';

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRequestSignupOtp: (username: string, email: string) => Promise<{ challengeId: string; expiresInMinutes: number }>;
  onVerifySignupOtp: (payload: {
    challengeId: string;
    otp: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  onLoginWithGoogle: (mode: 'login' | 'signup') => Promise<void>;
}

const PRIVACY_ERROR_MESSAGE = 'You must agree to the Privacy Policy to create an account';

const inputClassName =
  'bg-white/10 border-white/20 text-white placeholder:text-gray-500 transition-all duration-200 ' +
  'focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 hover:bg-white/15';

export function AuthForm({
  onLogin,
  onRequestSignupOtp,
  onVerifySignupOtp,
  onLoginWithGoogle,
}: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(() => window.location.hash === '#signup' ? 'signup' : 'login');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [agreedToPrivacyPolicy, setAgreedToPrivacyPolicy] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSignupOtp, setShowSignupOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [pendingSignup, setPendingSignup] = useState<{
    challengeId: string;
    username: string;
    email: string;
    password: string;
    expiresInMinutes: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validate = () => {
    if (mode === 'signup' && !formData.username.trim()) return 'Username is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!isValidEmail(formData.email)) return 'Enter a valid email address';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    if (mode === 'signup' && !formData.confirmPassword) return 'Confirm password is required';
    if (mode === 'signup' && formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return '';
  };

  const openForgotPassword = () => {
    setResetEmail(formData.email.trim());
    setResetError('');
    setResetSuccess('');
    setShowForgotPassword(true);
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setResetError('');
    setResetSuccess('');
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const email = resetEmail.trim();
    if (!email) {
      setResetError('Email is required');
      return;
    }
    if (!isValidEmail(email)) {
      setResetError('Please enter a valid email address');
      return;
    }

    setResetLoading(true);
    try {
      await apiClient.post('/auth/password-reset', {
        email,
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      });
      setResetSuccess('Password reset email sent. Please check your inbox.');
    } catch (error) {
      setResetError(getFriendlyResetError(error));
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'signup' && !agreedToPrivacyPolicy) {
      setError(PRIVACY_ERROR_MESSAGE);
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const challenge = await onRequestSignupOtp(formData.username.trim(), formData.email.trim());
        setPendingSignup({
          challengeId: challenge.challengeId,
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          expiresInMinutes: challenge.expiresInMinutes,
        });
        setSignupOtp('');
        setShowSignupOtp(true);
        setSuccess(`Verification code sent to ${formData.email.trim()}. It expires in ${challenge.expiresInMinutes} minutes.`);
      } else {
        await onLogin(formData.email.trim(), formData.password);
      }
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await onLoginWithGoogle(mode);
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup';
  const isSubmitDisabled = loading || (isSignup && !agreedToPrivacyPolicy) || showSignupOtp;

  const handleVerifySignupOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!pendingSignup) {
      setError('No pending sign-up request found');
      return;
    }

    if (signupOtp.length !== 6) {
      setError('Enter the 6-digit verification code');
      return;
    }

    setOtpLoading(true);
    try {
      await onVerifySignupOtp({
        challengeId: pendingSignup.challengeId,
        otp: signupOtp,
        username: pendingSignup.username,
        email: pendingSignup.email,
        password: pendingSignup.password,
      });
      setShowSignupOtp(false);
      setPendingSignup(null);
      setSignupOtp('');
      setMode('login');
      window.location.hash = 'login';
      setFormData({ username: '', email: pendingSignup.email, password: '', confirmPassword: '' });
      setSuccess('Account verified and created. Signing you in...');
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendSignupOtp = async () => {
    if (!pendingSignup) return;
    setError('');
    setSuccess('');
    setOtpLoading(true);
    try {
      const challenge = await onRequestSignupOtp(pendingSignup.username, pendingSignup.email);
      setPendingSignup((prev) => prev ? { ...prev, challengeId: challenge.challengeId, expiresInMinutes: challenge.expiresInMinutes } : prev);
      setSignupOtp('');
      setSuccess(`A new verification code was sent to ${pendingSignup.email}.`);
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Card className="w-full max-w-lg shadow-2xl shadow-black/30 backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader className="text-center space-y-3 pb-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-1 shadow-lg shadow-purple-950/30">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-white">Personal Expense Tracker</CardTitle>
          <CardDescription className="text-gray-300">
            {isSignup ? 'Create your account to get started' : 'Sign in to manage your expenses'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pb-8">
          {success && (
            <div className="text-emerald-300 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-md p-3 text-center">
              {success}
            </div>
          )}
          {error && (
            <div className="text-red-200 text-sm bg-red-500/10 border border-red-500/20 rounded-md p-3 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={inputClassName}
                  placeholder="Your username"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClassName}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`${inputClassName} pr-11`}
                  placeholder="Enter your password"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-xs text-purple-300 hover:text-purple-200 underline underline-offset-2 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`${inputClassName} pr-11`}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            {isSignup && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setAgreedToPrivacyPolicy(prev => !prev)}
                    className="mt-0.5 text-purple-400 hover:text-purple-300 transition-colors"
                    aria-label={agreedToPrivacyPolicy ? 'Uncheck privacy policy agreement' : 'Check privacy policy agreement'}
                  >
                    {agreedToPrivacyPolicy ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>
                  <p className="text-sm text-gray-300 leading-6">
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowPolicy(true)}
                      className="text-purple-300 hover:text-purple-200 underline underline-offset-2 transition-colors"
                    >
                      Privacy Policy
                    </button>
                  </p>
                </div>
              </div>
            )}

            {isSignup && error === PRIVACY_ERROR_MESSAGE && (
              <p className="text-xs text-red-300">
                {PRIVACY_ERROR_MESSAGE}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-950/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitDisabled}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isSignup ? 'Sending code...' : 'Signing in...'}
                </span>
              ) : (isSignup ? (showSignupOtp ? 'Verification sent' : 'Send Verification Code') : 'Login')}
            </Button>
          </form>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-gray-400">or</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            className={`w-full transition-all duration-200 ${
              acceptedTerms
                ? 'bg-white hover:bg-gray-100 text-gray-900'
                : 'bg-white/50 text-gray-500 cursor-not-allowed'
            } border border-gray-300`}
            disabled={loading || !acceptedTerms}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>

          <div className="flex items-start gap-3 mt-4 text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setAcceptedTerms(prev => !prev)}>
            <div className="mt-0.5 text-purple-400">
              {acceptedTerms ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            </div>
            <p className="text-sm text-gray-300 select-none">
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowPolicy(true); }}
                className="text-purple-400 hover:text-purple-300 underline underline-offset-2 decoration-purple-500/50"
              >
                Privacy Policy
              </button>
            </p>
          </div>

          <div className="text-center text-sm text-gray-300">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              className="text-purple-300 hover:text-purple-200 underline underline-offset-2 transition-colors"
              onClick={() => {
                const nextMode = mode === 'login' ? 'signup' : 'login';
                setMode(nextMode);
                window.location.hash = nextMode;
                setError('');
                setSuccess('');
              }}
            >
              {isSignup ? 'Login' : 'Sign Up'}
            </button>
          </div>
        </CardContent>
      </Card>

      {showPolicy && <PrivacyPolicy onClose={() => setShowPolicy(false)} />}

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl shadow-black/40 backdrop-blur-xl bg-slate-950/95 border-white/20">
            <CardHeader className="space-y-3">
              <CardTitle className="text-white">Forgot Password</CardTitle>
              <CardDescription className="text-gray-300">
                Enter your email and we will send a password reset link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resetSuccess && (
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  {resetSuccess}
                </div>
              )}
              {resetError && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {resetError}
                </div>
              )}
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail" className="text-gray-300">Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className={inputClassName}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200 disabled:opacity-60"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </span>
                  ) : 'Send Reset Link'}
                </Button>
              </form>
              <button
                type="button"
                onClick={closeForgotPassword}
                className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {showSignupOtp && pendingSignup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl shadow-black/40 backdrop-blur-xl bg-slate-950/95 border-white/20">
            <CardHeader className="space-y-3">
              <CardTitle className="text-white">Verify your email</CardTitle>
              <CardDescription className="text-gray-300">
                Enter the 6-digit code sent to {pendingSignup.email}. It expires in {pendingSignup.expiresInMinutes} minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}
              <form onSubmit={handleVerifySignupOtp} className="space-y-4">
                <InputOTP
                  maxLength={6}
                  value={signupOtp}
                  onChange={setSignupOtp}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d*"
                >
                  <InputOTPGroup className="justify-center gap-2">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200 disabled:opacity-60"
                    disabled={otpLoading}
                  >
                    {otpLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </span>
                    ) : 'Verify & Create Account'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendSignupOtp}
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    disabled={otpLoading}
                  >
                    Resend code
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignupOtp(false);
                    setPendingSignup(null);
                    setSignupOtp('');
                    setError('');
                    setSuccess('');
                  }}
                  className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to signup
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
