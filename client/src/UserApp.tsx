import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useData } from "./hooks/useData";
import { AuthForm } from "./components/AuthForm";
import { Dashboard } from "./components/Dashboard";
import { IncomeManager } from "./components/IncomeManager";
import { ExpenseManager } from "./components/ExpenseManager";
import { SplitManager } from "./components/SplitManager";
import { FriendsManager } from "./components/FriendsManager";
import { Reports } from "./components/Reports";
import { Button } from "./components/ui/button";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "./components/ui/tabs";
import {
    LayoutDashboard,
    TrendingUp,
    Users,
    FileText,
    UserPlus,
    LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonLoader } from "./components/SkeletonLoader";

type TabValue =
    | "dashboard"
    | "income"
    | "expenses"
    | "splits"
    | "reports";

export default function UserApp() {
    console.log("UserApp component initializing...");
    const { user, loading, loginWithGoogle, logout } = useAuth();
    console.log("Auth state:", { user: !!user, loading });

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
        return (sessionStorage.getItem('expenseTracker_activeTab') as TabValue) || 'dashboard';
    });

    const handleTabChange = (value: string) => {
        setActiveTab(value as TabValue);
        sessionStorage.setItem('expenseTracker_activeTab', value);
    };

    if (loading || dataLoading) {
        return <SkeletonLoader />;
    }

    if (!user) {
        return <AuthForm onLoginWithGoogle={loginWithGoogle} />;
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
                    <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-white mb-1">Expense Tracker</h1>
                        <div className="flex items-center gap-2">
                            <p className="text-gray-400">{user.email}</p>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                                Table ID: {user.id.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 8)}...
                            </span>
                        </div>
                    </div>
                    <Button
                        onClick={logout}
                        variant="default"
                        className="bg-red-600 hover:bg-red-700 text-white border-transparent"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={handleTabChange}
                    className="w-full"
                >
                    <TabsList className="grid w-full grid-cols-6 mb-8 bg-white/10 backdrop-blur-xl border border-white/20">
                        <TabsTrigger
                            value="dashboard"
                            className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300"
                        >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">
                                Dashboard
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="income"
                            className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Income</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="expenses"
                            className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300"
                        >
                            <TrendingDown className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Expenses</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="splits"
                            className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300"
                        >
                            <Users className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Splits</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="friends"
                            className="data-[state=active]:bg-white/10 text-gray-400 data-[state=active]:text-white"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Friends</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="reports"
                            className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-gray-300"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Reports</span>
                        </TabsTrigger>
                    </TabsList>

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
                </Tabs>
            </div>
        </div>
        </>
    );
}
