import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { DollarSign, CheckSquare, Square } from 'lucide-react';
import { PrivacyPolicy } from './PrivacyPolicy';

interface AuthFormProps {
  onLoginWithGoogle: () => Promise<void>;
}

export function AuthForm({ onLoginWithGoogle }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await onLoginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-white">Personal Expense Tracker</CardTitle>
          <CardDescription className="text-gray-300">
            Sign in with Google to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-md p-3 text-center">
              {error}
            </div>
          )}
          <Button
            onClick={handleGoogleSignIn}
            className={`w-full ${acceptedTerms ? 'bg-white hover:bg-gray-100 text-gray-900' : 'bg-white/50 text-gray-500 cursor-not-allowed'} border border-gray-300`}
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
          
          <div className="flex items-start gap-3 mt-4 text-left p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setAcceptedTerms(!acceptedTerms)}>
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
        </CardContent>
      </Card>

      {showPolicy && <PrivacyPolicy onClose={() => setShowPolicy(false)} />}
    </div>
  );
}