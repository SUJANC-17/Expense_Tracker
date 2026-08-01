import { X, ShieldCheck } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';

interface PrivacyPolicyProps {
  onClose: () => void;
}

const LAST_UPDATED = 'August 1, 2026';
const APP_NAME = 'Personal Expense Tracker';
const CONTACT_EMAIL = 'no-reply.expensetracker@zohomail.in';

const buildSections = () => [
  {
    id: '1',
    title: '1. Introduction',
    content: (
      <>
        <p>
          Welcome to <strong>{APP_NAME}</strong> ("we," "our," or "us"). We are committed to protecting
          your personal information and your right to privacy. This Privacy Policy explains how we collect,
          use, disclose, and safeguard your information when you use our application.
        </p>
        <p className="mt-2">
          Please read this policy carefully. If you disagree with its terms, please discontinue use of the
          application. By accessing or using {APP_NAME}, you acknowledge that you have read, understood, and
          agree to be bound by all the terms of this Privacy Policy.
        </p>
        <p className="mt-2">
          This policy applies to all information collected through our web application and any related
          services, sales, marketing, or events (collectively referred to as the "Services").
        </p>
      </>
    ),
  },
  {
    id: '2',
    title: '2. Information We Collect',
    content: (
      <>
        <p className="font-medium text-white mb-1">2.1 Information You Provide Directly</p>
        <ul className="list-disc list-inside space-y-1 mb-3 ml-2">
          <li><strong>Account Information:</strong> Full name, email address, and password when you register.</li>
          <li><strong>Google Sign-In:</strong> Name, email address, and profile photo from your Google account when you use Google Sign-In.</li>
          <li><strong>Financial Data:</strong> Income records, expense entries, categories, budgets, and split-bill details that you manually enter.</li>
          <li><strong>Friends List:</strong> Names or identifiers of people you add to manage shared expenses.</li>
          <li><strong>Preferences:</strong> Notification and reminder preferences you configure within the app.</li>
        </ul>
        <p className="font-medium text-white mb-1">2.2 Information Collected Automatically</p>
        <ul className="list-disc list-inside space-y-1 mb-3 ml-2">
          <li><strong>Session Data:</strong> Browser type, operating system, and session tokens used to keep you signed in.</li>
          <li><strong>Usage Data:</strong> Pages or features you access, timestamps of activity, and error logs for debugging purposes.</li>
          <li><strong>Device Information:</strong> Device type, browser version, and screen resolution for rendering optimization.</li>
        </ul>
        <p className="font-medium text-white mb-1">2.3 Information We Do NOT Collect</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>We do not collect or store credit/debit card numbers or banking credentials.</li>
          <li>We do not collect biometric data.</li>
          <li>We do not track your location or GPS coordinates.</li>
          <li>We do not collect information from third-party data brokers.</li>
        </ul>
      </>
    ),
  },
  {
    id: '3',
    title: '3. How We Use Your Information',
    content: (
      <>
        <p className="mb-2">We use the information we collect for the following purposes:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Account Management:</strong> To create and manage your account, authenticate your identity, and maintain your session.</li>
          <li><strong>Service Delivery:</strong> To provide core features including income/expense tracking, budget management, split-bill calculations, and financial report generation.</li>
          <li><strong>Security &amp; Verification:</strong> To send one-time passwords (OTP) for email verification, password changes, and account security alerts.</li>
          <li><strong>Notifications &amp; Reminders:</strong> To send scheduled email reminders based on your configured preferences (e.g., daily expense reminders).</li>
          <li><strong>Monthly Reports:</strong> To generate and deliver optional monthly financial summary emails if you opt in.</li>
          <li><strong>Product Improvement:</strong> To analyze usage patterns (in aggregate, not individually) to improve application performance and add new features.</li>
          <li><strong>Support:</strong> To respond to your queries, bug reports, and support requests.</li>
          <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal obligations.</li>
        </ul>
      </>
    ),
  },
  {
    id: '4',
    title: '4. Data Sharing & Disclosure',
    content: (
      <>
        <p className="mb-2">
          We do <strong>not sell, trade, or rent</strong> your personal information to third parties. We may
          share your data only in the following limited circumstances:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>Service Providers:</strong> We may share data with trusted third-party service providers
            who assist in operating the application (e.g., email delivery via SMTP providers). These parties
            are contractually obligated to keep your data confidential and secure.
          </li>
          <li>
            <strong>Google Authentication:</strong> When you sign in with Google, your authentication is
            processed by Google's servers under Google's Privacy Policy. We only receive your name, email,
            and profile photo from Google.
          </li>
          <li>
            <strong>Legal Requirements:</strong> We may disclose your information if required to do so by
            law or in response to valid requests by public authorities (e.g., a court order or government
            agency).
          </li>
          <li>
            <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets,
            your data may be transferred. We will provide notice before such a transfer and it will be
            subject to a new Privacy Policy.
          </li>
          <li>
            <strong>Protection of Rights:</strong> To protect and defend the rights, property, or safety of
            {APP_NAME}, our users, or others.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: '5',
    title: '5. Data Storage & Security',
    content: (
      <>
        <p className="mb-2">
          We take the security of your personal information seriously and implement a variety of security
          measures to maintain the safety of your data.
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Encryption:</strong> Passwords are hashed using industry-standard bcrypt hashing. Data transmitted between your browser and our servers is protected via HTTPS/TLS encryption.</li>
          <li><strong>Access Control:</strong> Access to your data is restricted to authenticated sessions only. Server-side authentication middleware validates every API request.</li>
          <li><strong>Database Security:</strong> Your financial records are stored in a secured database with regular backups.</li>
          <li><strong>OTP Expiry:</strong> One-time passwords for verification expire within 10 minutes of issuance to prevent misuse.</li>
          <li><strong>Session Tokens:</strong> Authentication tokens are short-lived and are invalidated upon logout.</li>
        </ul>
        <p className="mt-3 text-amber-300/80 text-xs">
          ⚠ While we implement industry-standard security measures, no method of transmission over the
          internet or electronic storage is 100% secure. We cannot guarantee absolute security.
        </p>
      </>
    ),
  },
  {
    id: '6',
    title: '6. Cookies & Local Storage',
    content: (
      <>
        <p className="mb-2">We use browser-based storage mechanisms to improve your experience:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>
            <strong>Session Storage (<code className="text-purple-300 text-xs">sessionStorage</code>):</strong> Used to remember your last active tab within the current browser session. This data is cleared when you close your browser tab.
          </li>
          <li>
            <strong>Local Storage (<code className="text-purple-300 text-xs">localStorage</code>):</strong> May be used to preserve lightweight UI preferences across sessions.
          </li>
          <li>
            <strong>HTTP Cookies:</strong> Authentication session tokens may be stored in secure, HTTP-only cookies to keep you logged in across browser refreshes.
          </li>
        </ul>
        <p className="mt-3">
          We do not use advertising cookies, cross-site tracking cookies, or third-party marketing trackers.
          You can clear all locally stored data by clearing your browser's cookies and storage.
        </p>
      </>
    ),
  },
  {
    id: '7',
    title: '7. Your Rights & Choices',
    content: (
      <>
        <p className="mb-2">
          You have the following rights regarding your personal data, which you can exercise at any time:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Right to Access:</strong> You can view all your stored financial data within the application at any time.</li>
          <li><strong>Right to Rectification:</strong> You can update or correct your account information, income/expense records, and profile details directly in the app.</li>
          <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> You can permanently delete your account and all associated data using the "Delete Account" option in the profile menu. This action is irreversible.</li>
          <li><strong>Right to Data Portability:</strong> You can export your financial data through the Reports section in Settings.</li>
          <li><strong>Right to Withdraw Consent:</strong> You can turn off email reminders and monthly reports at any time from the Reminder Settings.</li>
          <li><strong>Right to Opt-Out:</strong> You may opt out of non-essential communications by adjusting your notification preferences.</li>
        </ul>
        <p className="mt-3">
          To exercise any rights not directly available in the app, contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-400 hover:underline">
            {CONTACT_EMAIL}
          </a>.
        </p>
      </>
    ),
  },
  {
    id: '8',
    title: '8. Data Retention',
    content: (
      <>
        <p className="mb-2">
          We retain your personal data for as long as your account is active or as needed to provide you
          with the Services:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Active Accounts:</strong> Your data is retained for the lifetime of your account.</li>
          <li><strong>Inactive Accounts:</strong> Accounts with no activity for an extended period may be subject to automated cleanup. You will be notified before any such action via email.</li>
          <li><strong>Deleted Accounts:</strong> Upon account deletion, all personal data, financial records, friends lists, and preferences are permanently removed from our systems within 30 days.</li>
          <li><strong>Backup Retention:</strong> Data may persist in encrypted backups for up to 30 days after deletion for disaster recovery purposes, after which it is purged.</li>
          <li><strong>Legal Holds:</strong> In some circumstances, we may retain data for longer periods if required by law.</li>
        </ul>
      </>
    ),
  },
  {
    id: '9',
    title: "9. Children's Privacy",
    content: (
      <p>
        {APP_NAME} is not directed to individuals under the age of <strong>13 years</strong>. We do not
        knowingly collect personal information from children under 13. If we become aware that a child
        under 13 has provided us with personal information, we will take steps to delete such information
        from our systems. If you believe we have inadvertently collected information from a child under 13,
        please contact us immediately at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-400 hover:underline">
          {CONTACT_EMAIL}
        </a>.
      </p>
    ),
  },
  {
    id: '10',
    title: '10. Third-Party Services',
    content: (
      <>
        <p className="mb-2">Our application integrates with the following third-party services:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>Google Sign-In (Firebase Authentication):</strong> Used for OAuth-based login. Your
            use of Google Sign-In is governed by{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              Google's Privacy Policy
            </a>.
          </li>
          <li>
            <strong>Email Service (Zoho Mail / SMTP):</strong> We use Zoho Mail (
            <code className="text-purple-300 text-xs">{CONTACT_EMAIL}</code>) to deliver OTP verification
            emails, security alerts, and reminder notifications to your registered email address.
          </li>
        </ul>
        <p className="mt-3">
          We are not responsible for the privacy practices of these third-party services. We encourage you
          to review their respective privacy policies.
        </p>
      </>
    ),
  },
  {
    id: '11',
    title: '11. International Data Transfers',
    content: (
      <p>
        Our servers may be located in regions outside your country of residence. By using the Services,
        you consent to the transfer of your information to countries that may have different data
        protection laws than your country. We ensure that any such transfers are carried out in compliance
        with applicable data protection laws and that adequate safeguards are in place to protect your
        personal information.
      </p>
    ),
  },
  {
    id: '12',
    title: '12. Changes to This Policy',
    content: (
      <>
        <p className="mb-2">
          We reserve the right to update or modify this Privacy Policy at any time. When we make
          significant changes, we will:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Update the "Last Updated" date at the top of this document.</li>
          <li>Notify you via an in-app banner or email notification for material changes.</li>
          <li>Where required by law, seek your renewed consent.</li>
        </ul>
        <p className="mt-3">
          Your continued use of the application after the effective date of any changes constitutes your
          acceptance of the revised Privacy Policy. We encourage you to review this policy periodically.
        </p>
      </>
    ),
  },
  {
    id: '13',
    title: '13. Contact Us',
    content: (
      <>
        <p className="mb-2">
          If you have any questions, concerns, or requests regarding this Privacy Policy or your personal
          data, please contact us:
        </p>
        <ul className="list-none space-y-1 ml-2">
          <li>
            <strong>Email:</strong>{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-400 hover:underline">
              {CONTACT_EMAIL}
            </a>
          </li>
          <li>
            <strong>Response Time:</strong> We aim to respond to all privacy-related inquiries within{' '}
            <strong>5–10 business days</strong>.
          </li>
        </ul>
        <p className="mt-3">
          You also have the right to lodge a complaint with your local data protection authority if you
          believe your rights have been violated.
        </p>
      </>
    ),
  },
];

export function PrivacyPolicy({ onClose }: PrivacyPolicyProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (id: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const target = container.querySelector(`#pp-section-${id}`);
    if (!target) return;
    const containerTop = container.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const offset = targetTop - containerTop + container.scrollTop - 8;
    container.scrollTo({ top: offset, behavior: 'smooth' });
  };

  const sections = buildSections();

  useEffect(() => {
    // 1. Lock the page body so the browser scrollbar doesn't appear
    //    and the mouse wheel can't scroll the background page.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 2. Focus the scroll container after Radix finishes its own
    //    focus-restoration cycle (double-rAF beats Radix's single-rAF).
    let raf1: number;
    let raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = scrollContainerRef.current;
        if (el) el.focus();
      });
    });

    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      style={{ zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-[#0f172a] border border-white/10 w-full max-w-3xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/30">
              <ShieldCheck className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Privacy Policy</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full h-8 w-8 shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Table of Contents */}
        <div className="px-6 py-3 border-b border-white/10 bg-slate-900/50 shrink-0">
          <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">
            Jump to Section
          </p>
          <div className="flex flex-wrap gap-x-1 gap-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToSection(s.id)}
                className="text-xs text-purple-400 hover:text-purple-200 hover:bg-purple-500/10 transition-colors px-2 py-0.5 rounded-md border border-transparent hover:border-purple-500/20"
              >
                §{s.id}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollContainerRef}
          tabIndex={-1}
          className="overflow-y-scroll flex-1 min-h-0 px-6 py-6 space-y-7 text-slate-300 text-sm leading-relaxed outline-none"
        >
          {/* Intro Banner */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <p className="text-slate-300 text-xs leading-relaxed">
              <strong className="text-white">Your privacy matters.</strong> {APP_NAME} is a personal
              finance tool. We collect only what is necessary to run the service and never sell your data
              to third parties. This policy explains everything in plain language.
            </p>
          </div>

          {sections.map((section) => (
            <section key={section.id} id={`pp-section-${section.id}`}>
              <h3 className="text-base font-semibold text-white mb-3 pb-1 border-b border-white/10">
                {section.title}
              </h3>
              <div className="text-slate-300 text-sm leading-relaxed space-y-1">
                {section.content}
              </div>
            </section>
          ))}

          {/* Footer note */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
              <br />
              By using this application you agree to this Privacy Policy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between shrink-0 gap-4">
          <p className="text-xs text-slate-500 truncate">
            Questions?{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-400 hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
          <Button
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 shrink-0"
          >
            I Understand & Accept
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
