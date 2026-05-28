import { X } from 'lucide-react';
import { Button } from './ui/button';

interface PrivacyPolicyProps {
  onClose: () => void;
}

export function PrivacyPolicy({ onClose }: PrivacyPolicyProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <h2 className="text-xl font-bold text-white">Privacy Policy & Terms of Use</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm">
          <section>
            <h3 className="text-base font-semibold text-white mb-2">1. Data Collection</h3>
            <p>
              We collect information that you provide directly to us when you register for an account, such as your email address and Google profile information. We also store financial data you manually enter, including incomes, expenses, categories, and friends list.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-white mb-2">2. Data Usage</h3>
            <p>
              The data we collect is used exclusively to provide you with the personal expense tracking service. We use this data to calculate your balances, generate financial reports, and maintain your personal split-bill ledgers.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-white mb-2">3. Data Storage & Security</h3>
            <p>
              Your data is stored securely in our database. We implement reasonable security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-white mb-2">4. User Rights</h3>
            <p>
              You maintain full ownership of your data. You have the right to request a complete wipe of your account and all associated financial records at any time by contacting the administrator.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-white mb-2">5. Cookies and Local Storage</h3>
            <p>
              We use local storage mechanisms on your device (such as `localStorage` and `sessionStorage`) to keep you logged in and preserve your UI state across sessions to improve your experience.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
          <Button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20">
            I Understand
          </Button>
        </div>

      </div>
    </div>
  );
}
