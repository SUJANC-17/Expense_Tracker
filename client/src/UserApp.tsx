import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from './hooks/useAuth';
import { useData } from './hooks/useData';
import { AuthForm } from './components/AuthForm';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { Button } from './components/ui/button';
import { Tabs, TabsContent } from './components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuItem,
} from './components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './components/ui/input-otp';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { SkeletonLoader } from './components/SkeletonLoader';
import { apiClient } from './utils/api';
import {
    LayoutDashboard,
    TrendingUp,
    TrendingDown,
    Users,
    UserPlus,
    LogOut,
    Menu,
    X,
    BellRing,
    Clock3,
    ShieldCheck,
    Trash2,
    Heart,
    Loader2,
    KeyRound,
    Link2,
    Settings2,
} from 'lucide-react';
import type { ReminderSettings } from './appTypes';

const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const IncomeManager = lazy(() => import('./components/IncomeManager').then((module) => ({ default: module.IncomeManager })));
const ExpenseManager = lazy(() => import('./components/ExpenseManager').then((module) => ({ default: module.ExpenseManager })));
const SplitManager = lazy(() => import('./components/SplitManager').then((module) => ({ default: module.SplitManager })));
const FriendsManager = lazy(() => import('./components/FriendsManager').then((module) => ({ default: module.FriendsManager })));
const SettingsPage = lazy(() => import('./components/Settings').then((module) => ({ default: module.SettingsPage })));

type TabValue = 'dashboard' | 'income' | 'expenses' | 'splits' | 'friends' | 'settings';
type SettingsSection = 'budget' | 'reports';

const navItems = [
    { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { value: 'income', label: 'Income', icon: TrendingUp },
    { value: 'expenses', label: 'Expenses', icon: TrendingDown },
    { value: 'splits', label: 'Splits', icon: Users },
    { value: 'friends', label: 'Friends', icon: UserPlus },
    { value: 'settings', label: 'Settings', icon: Settings2 },
] as const;

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
    reminderEnabled: true,
    reminderTime: '21:00',
};

function getInitials(name?: string, email?: string) {
    const base = (name || email || 'U').trim();
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0] || 'U'}${parts[1][0] || ''}`.toUpperCase();
    return base.slice(0, 2).toUpperCase();
}

function isTabValue(value: string | null): value is TabValue {
    return value === 'dashboard' || value === 'income' || value === 'expenses' || value === 'splits' || value === 'friends' || value === 'settings';
}

function getInitialAppState(): { tab: TabValue; section: SettingsSection } {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';

    if (path === '/settings/reports') {
        return { tab: 'settings', section: 'reports' };
    }

    if (path === '/settings') {
        return { tab: 'settings', section: 'budget' };
    }

    const storedTab = sessionStorage.getItem('expenseTracker_activeTab');
    return {
        tab: isTabValue(storedTab) ? storedTab : 'dashboard',
        section: 'budget',
    };
}

function hasProvider(user: { providerIds?: string[]; hasPassword?: boolean; hasGoogle?: boolean } | null, providerId: 'password' | 'google.com') {
    if (!user) return false;
    if (providerId === 'password') return Boolean(user.hasPassword || user.providerIds?.includes('password'));
    return Boolean(user.hasGoogle || user.providerIds?.includes('google.com'));
}

export default function UserApp() {
    const {
        user,
        loading,
        login,
        requestSignupOtp,
        verifySignupOtp,
        loginWithGoogle,
        linkGoogle,
        requestPasswordChangeOtp,
        verifyPasswordChangeOtp,
        requestSetPasswordOtp,
        verifySetPasswordOtp,
        deleteAccount,
        logout,
    } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const initialAppState = getInitialAppState();
    const [activeTab, setActiveTab] = useState<TabValue>(initialAppState.tab);
    const [settingsSection, setSettingsSection] = useState<SettingsSection>(initialAppState.section);

    const {
        incomes,
        expenses,
        splits,
        friends,
        loading: dataLoading,
        budgets,
        categories,
        addIncome,
        updateIncome,
        deleteIncome,
        addExpense,
        updateExpense,
        deleteExpense,
        addSplitBulk,
        updateSplit,
        deleteSplit,
        markSplitPaid,
        addFriend,
        deleteFriend,
        saveBudget,
        removeBudget,
    } = useData(user?.id);

    const [showReminderDialog, setShowReminderDialog] = useState(false);
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showDonationDialog, setShowDonationDialog] = useState(false);
    const [reminderLoading, setReminderLoading] = useState(false);
    const [reminderSaving, setReminderSaving] = useState(false);
    const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
    const [passwordStep, setPasswordStep] = useState<'request' | 'verify'>('request');
    const [passwordMode, setPasswordMode] = useState<'set' | 'change'>('change');
    const [passwordChallengeId, setPasswordChallengeId] = useState('');
    const [passwordChallengeExpiresInMinutes, setPasswordChallengeExpiresInMinutes] = useState(10);
    const [passwordOtp, setPasswordOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [googleLinking, setGoogleLinking] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    useEffect(() => {
        if (!user) {
            setMobileMenuOpen(false);
            setShowReminderDialog(false);
            setShowPrivacyPolicy(false);
            setShowPasswordDialog(false);
            setShowDeleteDialog(false);
            setShowDonationDialog(false);
        }
    }, [user]);

    useEffect(() => {
        const syncFromLocation = () => {
            const path = window.location.pathname.replace(/\/+$/, '') || '/';
            if (path === '/settings/reports') {
                setActiveTab('settings');
                setSettingsSection('reports');
                return;
            }

            if (path === '/settings') {
                setActiveTab('settings');
                setSettingsSection('budget');
                return;
            }

            const urlTab = new URLSearchParams(window.location.search).get('tab');
            if (isTabValue(urlTab)) {
                setActiveTab(urlTab);
                sessionStorage.setItem('expenseTracker_activeTab', urlTab);
                return;
            }

            const storedTab = sessionStorage.getItem('expenseTracker_activeTab');
            if (isTabValue(storedTab)) {
                setActiveTab(storedTab);
            }
        };

        window.addEventListener('popstate', syncFromLocation);
        return () => window.removeEventListener('popstate', syncFromLocation);
    }, []);

    useEffect(() => {
        const active = () => {
            if (!showReminderDialog || !user) return;

            let cancelled = false;
            const load = async () => {
                setReminderLoading(true);
                try {
                    const data = await apiClient.get('/reminder-settings') as ReminderSettings;
                    if (cancelled) return;
                    setReminderSettings({
                        reminderEnabled: Boolean(data?.reminderEnabled ?? true),
                        reminderTime: data?.reminderTime || DEFAULT_REMINDER_SETTINGS.reminderTime,
                    });
                } catch (error) {
                    console.error('Failed to load reminder settings:', error);
                    toast.error('Could not load reminder settings');
                } finally {
                    if (!cancelled) setReminderLoading(false);
                }
            };

            load();
            return () => {
                cancelled = true;
            };
        };

        return active();
    }, [showReminderDialog, user]);

    const navigateSettings = (section: SettingsSection) => {
        const nextPath = section === 'reports' ? '/settings/reports' : '/settings';
        setActiveTab('settings');
        setSettingsSection(section);
        sessionStorage.setItem('expenseTracker_activeTab', 'settings');
        window.history.pushState({}, '', nextPath);
    };

    const handleTabChange = (value: string) => {
        const next = value as TabValue;
        if (next === 'settings') {
            navigateSettings('budget');
            setMobileMenuOpen(false);
            return;
        }

        setActiveTab(next);
        sessionStorage.setItem('expenseTracker_activeTab', next);
        if (window.location.pathname.startsWith('/settings')) {
            window.history.pushState({}, '', '/');
        }
        setMobileMenuOpen(false);
    };

    const handleSettingsSectionChange = (section: SettingsSection) => {
        navigateSettings(section);
    };

    const handleSaveReminder = async () => {
        setReminderSaving(true);
        try {
            const updated = await apiClient.put('/reminder-settings', reminderSettings) as ReminderSettings;
            setReminderSettings({
                reminderEnabled: Boolean(updated?.reminderEnabled ?? reminderSettings.reminderEnabled),
                reminderTime: updated?.reminderTime || reminderSettings.reminderTime,
            });
            toast.success('Reminder settings saved');
            setShowReminderDialog(false);
        } catch (error) {
            console.error('Failed to save reminder settings:', error);
            toast.error('Failed to save reminder settings');
        } finally {
            setReminderSaving(false);
        }
    };

    const openPasswordDialog = (mode: 'set' | 'change') => {
        setPasswordMode(mode);
        setPasswordStep('request');
        setPasswordChallengeId('');
        setPasswordChallengeExpiresInMinutes(10);
        setPasswordOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        setPasswordSuccess('');
        setShowPasswordDialog(true);
    };

    const handleRequestPasswordOtp = async () => {
        setPasswordError('');

        if (!newPassword || !confirmPassword) {
            setPasswordError('Enter and confirm your new password first');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        setPasswordLoading(true);
        try {
            const challenge = passwordMode === 'set'
                ? await requestSetPasswordOtp()
                : await requestPasswordChangeOtp();
            setPasswordChallengeId(challenge.challengeId);
            setPasswordChallengeExpiresInMinutes(challenge.expiresInMinutes);
            setPasswordOtp('');
            setPasswordStep('verify');
            setPasswordSuccess(`A verification code was sent to ${user?.email}.`);
        } catch (error) {
            setPasswordError(error instanceof Error ? error.message : 'Failed to send verification code');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleResendPasswordOtp = async () => {
        await handleRequestPasswordOtp();
    };

    const handleVerifyPasswordChange = async (event: FormEvent) => {
        event.preventDefault();
        setPasswordError('');

        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        if (passwordOtp.length !== 6) {
            setPasswordError('Enter the 6-digit verification code');
            return;
        }

        setPasswordLoading(true);
        try {
            if (passwordMode === 'set') {
                await verifySetPasswordOtp(passwordChallengeId, passwordOtp, newPassword);
                toast.success('Password set successfully');
            } else {
                await verifyPasswordChangeOtp(passwordChallengeId, passwordOtp, newPassword);
                toast.success('Password updated successfully');
            }
            setShowPasswordDialog(false);
        } catch (error) {
            setPasswordError(error instanceof Error ? error.message : 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleLinkGoogle = async () => {
        setGoogleLinking(true);
        try {
            await linkGoogle();
            toast.success('Google account linked successfully');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to link Google');
        } finally {
            setGoogleLinking(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await deleteAccount();
            toast.success('Account deleted');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete account');
        }
    };

    if (loading || dataLoading) {
        return <SkeletonLoader />;
    }

    if (!user) {
        return (
            <AuthForm
                onLogin={login}
                onRequestSignupOtp={requestSignupOtp}
                onVerifySignupOtp={verifySignupOtp}
                onLoginWithGoogle={loginWithGoogle}
            />
        );
    }

    return (
        <>
            <div className="mesh-bg-container">
                <div className="mesh-blob-1" />
                <div className="mesh-blob-2" />
                <div className="mesh-blob-3" />
            </div>

            <div className="min-h-screen">
                <div className="container mx-auto p-4 md:p-8">
                    <div className="mb-8 rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/10">
                        <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
                            <div className="flex items-center gap-3 md:hidden">
                                <button
                                    type="button"
                                    onClick={() => setMobileMenuOpen((open) => !open)}
                                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 p-2 text-white transition hover:bg-white/15"
                                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                                    aria-expanded={mobileMenuOpen}
                                >
                                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                                </button>

                                <div className="min-w-0 flex-1 text-center">
                                    <h1 className="truncate text-white">Expense Tracker</h1>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="inline-flex shrink-0 items-center rounded-full border border-white/15 bg-white/10 p-1 text-left text-white transition hover:bg-white/15"
                                        >
                                            <Avatar className="h-9 w-9 border border-white/20">
                                                <AvatarImage src={user.photoURL || undefined} alt={user.username} />
                                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                                    {getInitials(user.username, user.email)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-80 border-white/15 bg-slate-950/95 text-white backdrop-blur-xl">
                                        <DropdownMenuLabel className="space-y-1 px-3 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-white/20">
                                                    <AvatarImage src={user.photoURL || undefined} alt={user.username} />
                                                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                                        {getInitials(user.username, user.email)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-white">{user.username}</p>
                                                    <p className="truncate text-xs text-gray-400">{user.email}</p>
                                                </div>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-white/10" />
                                        {hasProvider(user, 'password') ? (
                                            <DropdownMenuItem
                                                className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    openPasswordDialog('change');
                                                }}
                                            >
                                                <KeyRound className="h-4 w-4 text-purple-300" />
                                                Change Password
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem
                                                className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    openPasswordDialog('set');
                                                }}
                                            >
                                                <KeyRound className="h-4 w-4 text-purple-300" />
                                                Set Password
                                            </DropdownMenuItem>
                                        )}
                                        {!hasProvider(user, 'google.com') && (
                                            <DropdownMenuItem
                                                className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    void handleLinkGoogle();
                                                }}
                                            >
                                                <Link2 className="h-4 w-4 text-sky-300" />
                                                {googleLinking ? 'Linking Google...' : 'Link Google'}
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                            className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                            onSelect={(event) => {
                                                event.preventDefault();
                                                setShowReminderDialog(true);
                                            }}
                                        >
                                            <BellRing className="h-4 w-4 text-emerald-300" />
                                            Reminder Time
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                            onSelect={(event) => {
                                                event.preventDefault();
                                                setShowDonationDialog(true);
                                            }}
                                        >
                                            <Heart className="h-4 w-4 text-rose-300" />
                                            Support Us
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                            onSelect={(event) => {
                                                event.preventDefault();
                                                setShowPrivacyPolicy(true);
                                            }}
                                        >
                                            <ShieldCheck className="h-4 w-4 text-sky-300" />
                                            Privacy Policy
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="cursor-pointer px-3 py-2 text-sm text-red-300 focus:bg-red-500/10 focus:text-red-200"
                                            onSelect={(event) => {
                                                event.preventDefault();
                                                setShowDeleteDialog(true);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete Account
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-white/10" />
                                        <DropdownMenuItem
                                            className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                            onSelect={(event) => {
                                                event.preventDefault();
                                                logout();
                                            }}
                                        >
                                            <LogOut className="h-4 w-4 text-gray-300" />
                                            Logout
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="hidden md:flex md:items-center md:justify-between md:gap-4">
                                <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
                                    <div className="min-w-0">
                                        <h1 className="truncate text-white mb-1">Expense Tracker</h1>
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-gray-400">{user.username}</p>
                                        </div>
                                    </div>

                                    <div className="hidden flex-wrap items-center gap-2 overflow-x-auto md:flex">
                                        {navItems.map((item) => {
                                            const isActive = activeTab === item.value;
                                            const Icon = item.icon;
                                            return (
                                                <button
                                                    key={item.value}
                                                    type="button"
                                                    onClick={() => handleTabChange(item.value)}
                                                    className={[
                                                        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                                                        isActive
                                                            ? 'border-white/30 bg-white/20 text-white shadow-lg shadow-black/10'
                                                            : 'border-transparent text-gray-300 hover:border-white/10 hover:bg-white/10 hover:text-white',
                                                    ].join(' ')}
                                                    aria-current={isActive ? 'page' : undefined}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="hidden items-center gap-3 md:flex">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className="inline-flex items-center rounded-full border border-white/15 bg-white/10 p-1.5 text-left text-white transition hover:bg-white/15"
                                            >
                                                <Avatar className="h-10 w-10 border border-white/20">
                                                    <AvatarImage src={user.photoURL || undefined} alt={user.username} />
                                                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                                        {getInitials(user.username, user.email)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-80 border-white/15 bg-slate-950/95 text-white backdrop-blur-xl">
                                            <DropdownMenuLabel className="space-y-1 px-3 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-white/20">
                                                        <AvatarImage src={user.photoURL || undefined} alt={user.username} />
                                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                                            {getInitials(user.username, user.email)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-white">{user.username}</p>
                                                        <p className="truncate text-xs text-gray-400">{user.email}</p>
                                                    </div>
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator className="bg-white/10" />
                                            {hasProvider(user, 'password') ? (
                                                <DropdownMenuItem
                                                    className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                                    onSelect={(event) => {
                                                        event.preventDefault();
                                                        openPasswordDialog('change');
                                                    }}
                                                >
                                                    <KeyRound className="h-4 w-4 text-purple-300" />
                                                    Change Password
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem
                                                    className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                                    onSelect={(event) => {
                                                        event.preventDefault();
                                                        openPasswordDialog('set');
                                                    }}
                                                >
                                                    <KeyRound className="h-4 w-4 text-purple-300" />
                                                    Set Password
                                                </DropdownMenuItem>
                                            )}
                                            {!hasProvider(user, 'google.com') && (
                                                <DropdownMenuItem
                                                    className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                                    onSelect={(event) => {
                                                        event.preventDefault();
                                                        void handleLinkGoogle();
                                                    }}
                                                >
                                                    <Link2 className="h-4 w-4 text-sky-300" />
                                                    {googleLinking ? 'Linking Google...' : 'Link Google'}
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                                className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    setShowReminderDialog(true);
                                                }}
                                            >
                                                <BellRing className="h-4 w-4 text-emerald-300" />
                                                Reminder Time
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    setShowDonationDialog(true);
                                                }}
                                            >
                                                <Heart className="h-4 w-4 text-rose-300" />
                                                Support Us
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    setShowPrivacyPolicy(true);
                                                }}
                                            >
                                                <ShieldCheck className="h-4 w-4 text-sky-300" />
                                                Privacy Policy
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="cursor-pointer px-3 py-2 text-sm text-red-300 focus:bg-red-500/10 focus:text-red-200"
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    setShowDeleteDialog(true);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete Account
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-white/10" />
                                            <DropdownMenuItem
                                                className="cursor-pointer px-3 py-2 text-sm text-gray-200 focus:bg-white/10 focus:text-white"
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    logout();
                                                }}
                                            >
                                                <LogOut className="h-4 w-4 text-gray-300" />
                                                Logout
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>

                        {mobileMenuOpen && (
                            <div className="border-t border-white/10 px-4 pb-4 md:hidden">
                                <div className="flex flex-col gap-2 pt-4">
                                    {navItems.map((item) => {
                                        const isActive = activeTab === item.value;
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.value}
                                                type="button"
                                                onClick={() => handleTabChange(item.value)}
                                                className={[
                                                    'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all',
                                                    isActive
                                                        ? 'border-white/30 bg-white/20 text-white'
                                                        : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white',
                                                ].join(' ')}
                                                aria-current={isActive ? 'page' : undefined}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                        <Suspense fallback={<SkeletonLoader />}>
                            <TabsContent value="dashboard" className="mt-0">
                                <Dashboard
                                    incomes={incomes}
                                    expenses={expenses}
                                    splits={splits}
                                    budgets={budgets}
                                    categories={categories}
                                />
                            </TabsContent>

                            <TabsContent value="income" className="mt-0">
                                <IncomeManager
                                    incomes={incomes}
                                    userId={user.id}
                                    onAdd={addIncome}
                                    onUpdate={updateIncome}
                                    onDelete={deleteIncome}
                                />
                            </TabsContent>

                            <TabsContent value="expenses" className="mt-0">
                                <ExpenseManager
                                    expenses={expenses}
                                    categories={categories}
                                    userId={user.id}
                                    onAdd={addExpense}
                                    onUpdate={updateExpense}
                                    onDelete={deleteExpense}
                                />
                            </TabsContent>

                            <TabsContent value="splits" className="mt-0">
                                <SplitManager
                                    splits={splits}
                                    onAddBulk={addSplitBulk}
                                    onUpdate={updateSplit}
                                    onDelete={deleteSplit}
                                    onMarkPaid={markSplitPaid}
                                    friends={friends}
                                />
                            </TabsContent>

                            <TabsContent value="friends" className="mt-0">
                                <FriendsManager friends={friends} onAdd={addFriend} onDelete={deleteFriend} />
                            </TabsContent>

                            <TabsContent value="settings" className="mt-0">
                                <SettingsPage
                                    budgets={budgets}
                                    saveBudget={saveBudget}
                                    removeBudget={removeBudget}
                                    section={settingsSection}
                                    onSectionChange={handleSettingsSectionChange}
                                    incomes={incomes}
                                    expenses={expenses}
                                    splits={splits}
                                    categories={categories}
                                />
                            </TabsContent>
                        </Suspense>
                    </Tabs>
                </div>
            </div>

            <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
                <DialogContent className="border-white/15 bg-slate-950 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Clock3 className="h-5 w-5 text-emerald-300" />
                            Reminder Time
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Move your reminder settings here. Your email reminder stays available without a separate settings page.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5">
                        {reminderLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading reminder settings...
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-gray-200">Reminder time</Label>
                                    <Input
                                        type="time"
                                        value={reminderSettings.reminderTime}
                                        onChange={(e) => setReminderSettings((prev) => ({ ...prev, reminderTime: e.target.value }))}
                                        className="border-white/15 bg-white/5 text-white"
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div>
                                        <p className="flex items-center gap-2 text-sm font-medium text-white">
                                            <ShieldCheck className="h-4 w-4 text-emerald-300" />
                                            Enable daily reminder
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Send a reminder if no expense has been logged by this time.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant={reminderSettings.reminderEnabled ? 'default' : 'outline'}
                                        onClick={() => setReminderSettings((prev) => ({ ...prev, reminderEnabled: !prev.reminderEnabled }))}
                                        className={reminderSettings.reminderEnabled ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'}
                                    >
                                        {reminderSettings.reminderEnabled ? 'Enabled' : 'Disabled'}
                                    </Button>
                                </div>
                            </>
                        )}
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                onClick={handleSaveReminder}
                                disabled={reminderSaving || reminderLoading}
                                className="flex-1 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                            >
                                {reminderSaving ? 'Saving...' : 'Save reminder'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowReminderDialog(false)}
                                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent className="border-white/15 bg-slate-950 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-purple-300" />
                            {passwordMode === 'set' ? 'Set Password' : 'Change Password'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {passwordMode === 'set'
                                ? 'Verify your email before setting a password on this Google account.'
                                : 'Verify your email before changing the password on your Firebase account.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {passwordError && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                                {passwordError}
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                                {passwordSuccess}
                            </div>
                        )}

                        {passwordStep === 'request' ? (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-300">
                                    {passwordMode === 'set'
                                        ? `Enter your new password first, then send a 6-digit code to ${user.email}.`
                                        : `Enter your new password first, then send a 6-digit code to ${user.email}.`}
                                </p>
                                <div className="space-y-2">
                                    <Label className="text-gray-200">New password</Label>
                                    <Input
                                        type="password"
                                        name="newPassword"
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="border-white/15 bg-white/5 text-white"
                                        placeholder="Enter new password"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-200">Confirm password</Label>
                                    <Input
                                        type="password"
                                        name="confirmPassword"
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="border-white/15 bg-white/5 text-white"
                                        placeholder="Confirm new password"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        onClick={handleRequestPasswordOtp}
                                        disabled={passwordLoading}
                                        className="flex-1 bg-purple-500 text-white hover:bg-purple-400"
                                    >
                                        {passwordLoading ? 'Sending code...' : 'Send verification code'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowPasswordDialog(false)}
                                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleVerifyPasswordChange} className="space-y-4">
                                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
                                    Code sent to {user.email}. Use the same password you entered before requesting the OTP. It expires in {passwordChallengeExpiresInMinutes} minutes.
                                </div>
                                <input
                                    type="text"
                                    name="username"
                                    autoComplete="username"
                                    value={user.email}
                                    readOnly
                                    tabIndex={-1}
                                    aria-hidden="true"
                                    className="sr-only"
                                />
                                <input
                                    type="password"
                                    name="new-password"
                                    autoComplete="new-password"
                                    value={newPassword}
                                    readOnly
                                    tabIndex={-1}
                                    aria-hidden="true"
                                    className="sr-only"
                                />
                                <InputOTP
                                    maxLength={6}
                                    value={passwordOtp}
                                    onChange={setPasswordOtp}
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="\d*"
                                >
                                    <InputOTPGroup className="justify-center gap-2">
                                        <InputOTPSlot index={0} className="border-white/20" />
                                        <InputOTPSlot index={1} className="border-white/20" />
                                        <InputOTPSlot index={2} className="border-white/20" />
                                        <InputOTPSlot index={3} className="border-white/20" />
                                        <InputOTPSlot index={4} className="border-white/20" />
                                        <InputOTPSlot index={5} className="border-white/20" />
                                    </InputOTPGroup>
                                </InputOTP>

                                <div className="flex gap-3">
                                    <Button
                                        type="submit"
                                        disabled={passwordLoading}
                                        className="flex-1 bg-purple-500 text-white hover:bg-purple-400"
                                    >
                                        {passwordLoading ? 'Updating...' : 'Update password'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleResendPasswordOtp}
                                        disabled={passwordLoading}
                                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                                    >
                                        Resend code
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowPasswordDialog(false)}
                                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="border-white/15 bg-slate-950 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-300" />
                            Delete Account
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            This deletes your Firebase account and all expense data permanently. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                            Type of deletion: permanent account removal.
                        </div>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                onClick={handleDeleteAccount}
                                className="flex-1 bg-red-500 text-white hover:bg-red-400"
                            >
                                Delete permanently
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowDeleteDialog(false)}
                                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showDonationDialog} onOpenChange={setShowDonationDialog}>
                <DialogContent className="border-white/15 bg-slate-950 text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Heart className="h-5 w-5 text-rose-300" />
                            Support Expense Tracker
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Support options are coming soon.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-200">
                            Coming soon. We are preparing a clean support flow for donations and tips.
                        </div>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                onClick={() => setShowDonationDialog(false)}
                                className="flex-1 bg-white/10 text-white hover:bg-white/15"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {showPrivacyPolicy && (
                <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />
            )}
        </>
    );
}
