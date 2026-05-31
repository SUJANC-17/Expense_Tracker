import { lazy, Suspense, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useData } from "./hooks/useData";
import { AuthForm } from "./components/AuthForm";
import { Button } from "./components/ui/button";
import {
    Tabs,
    TabsContent,
} from "./components/ui/tabs";
import {
    LayoutDashboard,
    TrendingUp,
    TrendingDown,
    Users,
    FileText,
    UserPlus,
    LogOut,
    Settings2,
    Menu,
    X,
} from "lucide-react";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { Settings } from "./components/Settings";

const Dashboard = lazy(() => import("./components/Dashboard").then((module) => ({ default: module.Dashboard })));
const IncomeManager = lazy(() => import("./components/IncomeManager").then((module) => ({ default: module.IncomeManager })));
const ExpenseManager = lazy(() => import("./components/ExpenseManager").then((module) => ({ default: module.ExpenseManager })));
const SplitManager = lazy(() => import("./components/SplitManager").then((module) => ({ default: module.SplitManager })));
const FriendsManager = lazy(() => import("./components/FriendsManager").then((module) => ({ default: module.FriendsManager })));
const Reports = lazy(() => import("./components/Reports").then((module) => ({ default: module.Reports })));

type TabValue =
    | "dashboard"
    | "income"
    | "expenses"
    | "splits"
    | "friends"
    | "reports"
    | "settings";

const navItems = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { value: "income", label: "Income", icon: TrendingUp },
    { value: "expenses", label: "Expenses", icon: TrendingDown },
    { value: "splits", label: "Splits", icon: Users },
    { value: "friends", label: "Friends", icon: UserPlus },
    { value: "reports", label: "Reports", icon: FileText },
    { value: "settings", label: "Settings", icon: Settings2 },
] as const;

export default function UserApp() {
    console.log("UserApp component initializing...");
    const { user, loading, login, signup, loginWithGoogle, logout } = useAuth();
    console.log("Auth state:", { user: !!user, loading });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const {
        incomes,
        expenses,
        splits,
        friends,
        loading: dataLoading,
        addIncome,
        updateIncome,
        deleteIncome,
        addExpense,
        updateExpense,
        deleteExpense,
        addSplit,
        addSplitBulk,
        updateSplit,
        deleteSplit,
        markSplitPaid,
        addFriend,
        deleteFriend,
    } = useData(user?.id);

    const [activeTab, setActiveTab] = useState<TabValue>(() => {
        const urlTab = new URLSearchParams(window.location.search).get('tab');
        if (urlTab === 'dashboard' || urlTab === 'income' || urlTab === 'expenses' || urlTab === 'splits' || urlTab === 'friends' || urlTab === 'reports' || urlTab === 'settings') {
            return urlTab;
        }
        return (sessionStorage.getItem('expenseTracker_activeTab') as TabValue) || 'dashboard';
    });

    const handleTabChange = (value: string) => {
        setActiveTab(value as TabValue);
        sessionStorage.setItem('expenseTracker_activeTab', value);
        setMobileMenuOpen(false);
    };

    if (loading || dataLoading) {
        return <SkeletonLoader />;
    }

    if (!user) {
        return <AuthForm onLogin={login} onSignup={signup} onLoginWithGoogle={loginWithGoogle} />;
    }

    return (
        <>
            <div className="mesh-bg-container">
                <div className="mesh-blob-1"></div>
                <div className="mesh-blob-2"></div>
                <div className="mesh-blob-3"></div>
            </div>
            
            <div className="min-h-screen">
                <div className="container mx-auto p-4 md:p-8">
                    <div className="mb-8 rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/10">
                        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
                            <div className="min-w-0">
                                <h1 className="truncate text-white mb-1">Expense Tracker</h1>
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-gray-400">{user.username}</p>
                                </div>
                            </div>

                            <div className="hidden flex-1 items-center justify-center gap-2 overflow-x-auto md:flex">
                                {navItems.map((item) => {
                                    const isActive = activeTab === item.value;
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.value}
                                            type="button"
                                            onClick={() => handleTabChange(item.value)}
                                            className={[
                                                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
                                                isActive
                                                    ? "border-white/30 bg-white/20 text-white shadow-lg shadow-black/10"
                                                    : "border-transparent text-gray-300 hover:border-white/10 hover:bg-white/10 hover:text-white",
                                            ].join(" ")}
                                            aria-current={isActive ? "page" : undefined}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="hidden items-center gap-3 md:flex">
                                <Button
                                    onClick={logout}
                                    variant="default"
                                    className="border-transparent bg-red-600 text-white hover:bg-red-700"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </Button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen((open) => !open)}
                                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 p-2 text-white transition hover:bg-white/15 md:hidden"
                                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                                aria-expanded={mobileMenuOpen}
                            >
                                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>
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
                                                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all",
                                                    isActive
                                                        ? "border-white/30 bg-white/20 text-white"
                                                        : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white",
                                                ].join(" ")}
                                                aria-current={isActive ? "page" : undefined}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {item.label}
                                            </button>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20 hover:text-white"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                <Tabs
                    value={activeTab}
                    onValueChange={handleTabChange}
                    className="w-full"
                >
                    <Suspense fallback={<SkeletonLoader />}>
                        <TabsContent value="dashboard" className="mt-0">
                            <Dashboard
                                incomes={incomes}
                                expenses={expenses}
                                splits={splits}
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
                                userId={user.id}
                                onAdd={addExpense}
                                onUpdate={updateExpense}
                                onDelete={deleteExpense}
                            />
                        </TabsContent>

                        <TabsContent value="splits" className="mt-0">
                            <SplitManager
                                splits={splits}
                                userId={user.id}
                                onAdd={addSplit}
                                onAddBulk={addSplitBulk}
                                onUpdate={updateSplit}
                                onDelete={deleteSplit}
                                onMarkPaid={markSplitPaid}
                                friends={friends}
                            />
                        </TabsContent>

                        <TabsContent value="friends" className="mt-0">
                            <FriendsManager
                                friends={friends}
                                onAdd={addFriend}
                                onDelete={deleteFriend}
                            />
                        </TabsContent>

                        <TabsContent value="reports" className="mt-0">
                            <Reports
                                incomes={incomes}
                                expenses={expenses}
                                splits={splits}
                            />
                        </TabsContent>

                        <TabsContent value="settings" className="mt-0">
                            <Settings />
                        </TabsContent>
                    </Suspense>
                </Tabs>
            </div>
        </div>
        </>
    );
}
