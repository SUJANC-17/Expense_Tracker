import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
    Trash2,
    Database,
    LogOut,
    Users,
    Activity,
    HardDrive,
    Download,
    Tag,
    Plus,
    Edit2,
    Check,
    X,
    ShieldAlert,
    FileText,
} from 'lucide-react';
import { adminApi } from '../../utils/adminApi';

interface SystemHealth {
    status: string;
    startedAt: string;
    uptimeSeconds: number;
    dbSizeBytes: number;
    memory: {
        rss: number;
        heapUsed: number;
        systemTotal: number;
        systemFree: number;
    };
}

interface Analytics {
    totalUsers: number;
    activeToday: number;
}

interface Category {
    id: number;
    name: string;
}

interface AdminUserRow {
    id: string;
    email: string;
    username?: string | null;
    created_at?: string;
    last_active_at?: string;
    monthName?: string;
    totalIncome?: number;
    totalExpenses?: number;
    balance?: number;
    unpaidSplitsCount?: number;
    unpaidSplitsTotal?: number;
}

interface SummaryTransaction {
    id: number;
    amount: number;
    description?: string | null;
    date: string;
}

interface AdminUserSummary {
    year: number;
    month: number;
    monthName: string;
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    unpaidSplitsCount: number;
    unpaidSplitsTotal: number;
    incomes: Array<SummaryTransaction & { source: string }>;
    expenses: Array<SummaryTransaction & { category?: string | null }>;
    unpaidSplits: Array<SummaryTransaction & { friendName: string }>;
}

function formatLastActive(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    if (hours === 0) hours = 12;

    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${period}`;
}

export default function AdminDashboard() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'categories'>('overview');
    const [loading, setLoading] = useState(false);

    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [selectedUserSummary, setSelectedUserSummary] = useState<{ uid: string; email: string; data: AdminUserSummary } | null>(null);
    const [selectedUserTables, setSelectedUserTables] = useState<{ uid: string; tables: string[] } | null>(null);
    const [selectedTableData, setSelectedTableData] = useState<{ tableName: string; rows: any[] } | null>(null);
    const [userSummaryLoading, setUserSummaryLoading] = useState(false);

    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<number | null>(null);
    const [editCategoryName, setEditCategoryName] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) setIsLoggedIn(true);
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            if (activeTab === 'users') fetchUsers();
            if (activeTab === 'overview') {
                fetchHealth();
                fetchAnalytics();
            }
            if (activeTab === 'categories') fetchCategories();
        }
    }, [isLoggedIn, activeTab]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await adminApi.post('/admin/login', { email, pin });
            if (res.success && res.token) {
                localStorage.setItem('admin_token', res.token);
                setIsLoggedIn(true);
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        setIsLoggedIn(false);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            setUsers(await adminApi.get('/admin/users'));
        } catch (err) {
            if (!localStorage.getItem('admin_token')) setIsLoggedIn(false);
        } finally {
            setLoading(false);
        }
    };

    const fetchHealth = async () => {
        try {
            setHealth(await adminApi.get('/admin/system/health'));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAnalytics = async () => {
        try {
            setAnalytics(await adminApi.get('/admin/system/analytics'));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchCategories = async () => {
        try {
            setCategories(await adminApi.get('/admin/categories'));
        } catch (err) {
            console.error(err);
        }
    };

    const openUserSummary = async (uid: string, email: string) => {
        setUserSummaryLoading(true);
        try {
            const data = await adminApi.get(`/admin/users/${uid}/summary/current`) as AdminUserSummary;
            setSelectedUserSummary({ uid, email, data });
            setSelectedUserTables(null);
            setSelectedTableData(null);
        } catch (err) {
            alert('Failed to fetch user summary');
        } finally {
            setUserSummaryLoading(false);
        }
    };

    const inspectTables = async (uid: string) => {
        try {
            setSelectedUserTables({ uid, tables: await adminApi.get(`/admin/users/${uid}/tables`) });
            setSelectedTableData(null);
        } catch (err) {
            alert('Failed to fetch tables');
        }
    };

    const inspectTableData = async (uid: string, tableName: string) => {
        try {
            const res = await adminApi.get(`/admin/users/${uid}/tables/${tableName}/data`);
            const fetchedRows = Array.isArray(res) ? res : (res.data || []);
            setSelectedTableData({ tableName, rows: fetchedRows });
        } catch (err) {
            console.error(err);
        }
    };

    const deleteUser = async (uid: string, userEmail: string) => {
        if (!confirm(`Permanently delete user ${userEmail} and all their data?`)) return;
        try {
            await adminApi.delete(`/admin/users/${uid}`);
            alert('User deleted.');
            if (selectedUserSummary?.uid === uid) {
                setSelectedUserSummary(null);
            }
            setSelectedUserTables(null);
            setSelectedTableData(null);
            await fetchUsers();
            if (activeTab === 'overview') {
                await fetchAnalytics();
            }
        } catch (err: any) {
            alert(err.message || 'Failed to delete user');
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            await adminApi.post('/admin/categories', { name: newCategoryName });
            setNewCategoryName('');
            fetchCategories();
        } catch (err) {
            alert('Failed to add category');
        }
    };

    const handleUpdateCategory = async (id: number) => {
        if (!editCategoryName.trim()) return;
        try {
            await adminApi.put(`/admin/categories/${id}`, { name: editCategoryName });
            setEditingCategory(null);
            fetchCategories();
        } catch (err) {
            alert('Failed to update category');
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Delete this category? Users who used it might lose the category label.')) return;
        try {
            await adminApi.delete(`/admin/categories/${id}`);
            fetchCategories();
        } catch (err) {
            alert('Failed to delete category');
        }
    };

    const handleBackup = async () => {
        try {
            await adminApi.download(
                '/admin/system/backup',
                `expense_tracker_backup_${new Date().toISOString().split('T')[0]}.db`
            );
        } catch (err: any) {
            alert(err.message || 'Failed to download database');
        }
    };

    const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#09090b] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#09090b] to-[#09090b] p-4">
                <Card className="w-full max-w-md backdrop-blur-2xl bg-white/5 border-white/10 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                    <CardHeader className="text-center pt-8">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                            <ShieldAlert className="w-8 h-8 text-red-400" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-white">Admin Control</CardTitle>
                        <CardDescription className="text-slate-400">Restricted Access Area</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-8">
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <Input type="email" placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-slate-200 h-12 px-4 focus:ring-red-500/50 transition-all" required />
                            </div>
                            <div className="space-y-2">
                                <Input type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} className="bg-white/5 border-white/10 text-slate-200 h-12 px-4 focus:ring-red-500/50 transition-all" required />
                            </div>
                            {error && <p className="text-red-400 text-sm text-center font-medium animate-pulse">{error}</p>}
                            <Button type="submit" className="w-full h-12 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/25 transition-all text-base font-semibold">
                                Authenticate
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h`;
        }

        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-slate-200 flex flex-col md:flex-row">
            <aside className="w-full md:w-64 border-b md:border-r border-white/10 bg-white/[0.02] flex flex-col">
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg shadow-red-500/20">
                            <ShieldAlert className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white">Admin Portal</h1>
                            <p className="text-xs text-slate-500">System V1.0</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 p-4 flex flex-col gap-2">
                    <Button variant={activeTab === 'overview' ? 'default' : 'ghost'} className={`justify-start ${activeTab === 'overview' ? 'bg-white/10 text-white hover:bg-white/15' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} onClick={() => setActiveTab('overview')}>
                        <Activity className="w-4 h-4 mr-3" /> Overview
                    </Button>
                    <Button variant={activeTab === 'users' ? 'default' : 'ghost'} className={`justify-start ${activeTab === 'users' ? 'bg-white/10 text-white hover:bg-white/15' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} onClick={() => setActiveTab('users')}>
                        <Users className="w-4 h-4 mr-3" /> Users
                    </Button>
                    <Button variant={activeTab === 'categories' ? 'default' : 'ghost'} className={`justify-start ${activeTab === 'categories' ? 'bg-white/10 text-white hover:bg-white/15' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} onClick={() => setActiveTab('categories')}>
                        <Tag className="w-4 h-4 mr-3" /> Categories
                    </Button>
                </nav>
                <div className="p-4 border-t border-white/10">
                    <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                        <LogOut className="w-4 h-4 mr-3" /> Logout
                    </Button>
                </div>
            </aside>

            <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">System Overview</h2>
                                <p className="text-slate-400 mt-1">Live metrics and platform health.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-white/5 border-white/10 backdrop-blur-xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
                                            Total Users <Users className="w-4 h-4 text-blue-400" />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold text-white">{analytics?.totalUsers || 0}</div>
                                        <p className="text-xs text-slate-500 mt-1">{analytics?.activeToday || 0} active today</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/5 border-white/10 backdrop-blur-xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
                                            Server Uptime <Activity className="w-4 h-4 text-emerald-400" />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold text-white">{health ? formatUptime(health.uptimeSeconds) : '-'}</div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-xs text-emerald-400 font-medium">Online</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/5 border-white/10 backdrop-blur-xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
                                            Database Size <HardDrive className="w-4 h-4 text-purple-400" />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold text-white">{health ? formatBytes(health.dbSizeBytes) : '-'}</div>
                                        <p className="text-xs text-slate-500 mt-1">SQLite SQL.js Engine</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-white/10 overflow-hidden">
                                <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Database className="w-5 h-5 text-indigo-400" /> Database Management
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div>
                                            <h3 className="font-medium text-white">Full Database Backup</h3>
                                            <p className="text-sm text-slate-400 mt-1">Download the entire SQLite database file directly to your local machine for safekeeping.</p>
                                        </div>
                                        <Button onClick={handleBackup} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 whitespace-nowrap">
                                            <Download className="w-4 h-4 mr-2" /> Download .db File
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">User Management</h2>
                                <p className="text-slate-400 mt-1">Inspect current month finances and perform account wipes.</p>
                            </div>

                            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-white/10 bg-white/[0.02] hover:bg-white/[0.02]">
                                                <TableHead className="text-slate-400 font-medium">User Email</TableHead>
                                                <TableHead className="text-slate-400 font-medium">Firebase UID</TableHead>
                                                <TableHead className="text-slate-400 font-medium text-right">Income</TableHead>
                                                <TableHead className="text-slate-400 font-medium text-right">Expenses</TableHead>
                                                <TableHead className="text-slate-400 font-medium text-right">Balance</TableHead>
                                                <TableHead className="text-slate-400 font-medium text-right">Unpaid Splits</TableHead>
                                                <TableHead className="text-slate-400 font-medium">Last Active</TableHead>
                                                <TableHead className="text-slate-400 font-medium text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {users.length === 0 && !loading && (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">No users found.</TableCell>
                                                </TableRow>
                                            )}
                                            {users.map((user) => {
                                                const isSelected = selectedUserSummary?.uid === user.id;
                                                return (
                                                    <TableRow
                                                        key={user.id}
                                                        className={`border-white/5 transition-colors cursor-pointer ${isSelected ? 'bg-blue-500/10 hover:bg-blue-500/15' : 'hover:bg-white/[0.04]'}`}
                                                        onClick={() => openUserSummary(user.id, user.email)}
                                                    >
                                                        <TableCell className="font-medium text-slate-200">{user.email}</TableCell>
                                                        <TableCell className="text-slate-500 text-xs font-mono">{user.id}</TableCell>
                                                        <TableCell className="text-right text-emerald-300">
                                                            {formatCurrency(user.totalIncome || 0)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-rose-300">
                                                            {formatCurrency(user.totalExpenses || 0)}
                                                        </TableCell>
                                                        <TableCell className={`text-right font-semibold ${(user.balance || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                                            {formatCurrency(user.balance || 0)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-orange-300 font-medium">{user.unpaidSplitsCount || 0}</span>
                                                                <span className="text-xs text-slate-500">{formatCurrency(user.unpaidSplitsTotal || 0)}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs font-normal border-white/10 bg-white/5 text-slate-300">
                                                                {user.last_active_at ? formatLastActive(user.last_active_at) : 'Never'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        void openUserSummary(user.id, user.email);
                                                                    }}
                                                                    className="h-8 w-8 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                                                                    title="View summary"
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        void inspectTables(user.id);
                                                                    }}
                                                                    className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                                    title="Inspect raw tables"
                                                                >
                                                                    <Database className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        void deleteUser(user.id, user.email);
                                                                    }}
                                                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                                    title="Delete user"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {userSummaryLoading && (
                                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                                    <CardContent className="p-6 text-slate-400">
                                        Loading user summary...
                                    </CardContent>
                                </Card>
                            )}

                            {selectedUserSummary && !userSummaryLoading && (
                                <Card className="bg-blue-950/20 border-blue-500/20 animate-in fade-in slide-in-from-bottom-4">
                                    <CardHeader className="border-b border-blue-500/10 bg-blue-500/5 flex flex-row items-start justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-blue-300 flex items-center gap-2 text-base">
                                                <FileText className="w-4 h-4" />
                                                {selectedUserSummary.email}
                                            </CardTitle>
                                            <CardDescription className="text-slate-400">
                                                {selectedUserSummary.uid} - {selectedUserSummary.data.monthName} {selectedUserSummary.data.year}
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => inspectTables(selectedUserSummary.uid)}
                                                className="h-8 text-blue-300 hover:text-blue-200 hover:bg-blue-500/20"
                                            >
                                                <Database className="w-4 h-4 mr-2" />
                                                Raw tables
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedUserSummary(null)}
                                                className="h-8 text-blue-300 hover:text-blue-200 hover:bg-blue-500/20"
                                            >
                                                Close
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <Card className="bg-white/5 border-white/10">
                                                <CardContent className="p-4 space-y-1">
                                                    <p className="text-xs text-slate-400">Current month income</p>
                                                    <p className="text-lg font-semibold text-emerald-300">{formatCurrency(selectedUserSummary.data.totalIncome)}</p>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-white/5 border-white/10">
                                                <CardContent className="p-4 space-y-1">
                                                    <p className="text-xs text-slate-400">Current month expenses</p>
                                                    <p className="text-lg font-semibold text-rose-300">{formatCurrency(selectedUserSummary.data.totalExpenses)}</p>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-white/5 border-white/10">
                                                <CardContent className="p-4 space-y-1">
                                                    <p className="text-xs text-slate-400">Balance</p>
                                                    <p className={`text-lg font-semibold ${selectedUserSummary.data.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                                        {formatCurrency(selectedUserSummary.data.balance)}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-white/5 border-white/10">
                                                <CardContent className="p-4 space-y-1">
                                                    <p className="text-xs text-slate-400">Unpaid splits</p>
                                                    <p className="text-lg font-semibold text-orange-300">
                                                        {selectedUserSummary.data.unpaidSplitsCount} / {formatCurrency(selectedUserSummary.data.unpaidSplitsTotal)}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                            <Card className="bg-white/5 border-white/10">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-sm text-slate-300">Income entries</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    {selectedUserSummary.data.incomes.length > 0 ? (
                                                        selectedUserSummary.data.incomes.map((income) => (
                                                            <div key={income.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div>
                                                                        <p className="text-sm text-white">{income.source}</p>
                                                                        {income.description && <p className="text-xs text-slate-400">{income.description}</p>}
                                                                        <p className="text-xs text-slate-500 mt-1">{new Date(income.date).toLocaleDateString()}</p>
                                                                    </div>
                                                                    <p className="text-emerald-300 font-medium">{formatCurrency(income.amount)}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-slate-500">No income entries this month.</p>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-white/5 border-white/10">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-sm text-slate-300">Expense entries</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    {selectedUserSummary.data.expenses.length > 0 ? (
                                                        selectedUserSummary.data.expenses.map((expense) => (
                                                            <div key={expense.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div>
                                                                        <p className="text-sm text-white">{expense.category || 'Uncategorized'}</p>
                                                                        {expense.description && <p className="text-xs text-slate-400">{expense.description}</p>}
                                                                        <p className="text-xs text-slate-500 mt-1">{new Date(expense.date).toLocaleDateString()}</p>
                                                                    </div>
                                                                    <p className="text-rose-300 font-medium">{formatCurrency(expense.amount)}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-slate-500">No expense entries this month.</p>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-white/5 border-white/10">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-sm text-slate-300">Unpaid splits</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    {selectedUserSummary.data.unpaidSplits.length > 0 ? (
                                                        selectedUserSummary.data.unpaidSplits.map((split) => (
                                                            <div key={split.id} className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div>
                                                                        <p className="text-sm text-white">{split.friendName}</p>
                                                                        {split.description && <p className="text-xs text-slate-300">{split.description}</p>}
                                                                        <p className="text-xs text-slate-500 mt-1">{new Date(split.date).toLocaleDateString()}</p>
                                                                    </div>
                                                                    <p className="text-orange-300 font-medium">{formatCurrency(split.amount)}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-slate-500">No unpaid splits this month.</p>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {selectedUserTables && (
                                <Card className="bg-blue-950/20 border-blue-500/20 animate-in fade-in slide-in-from-bottom-4">
                                    <CardHeader className="border-b border-blue-500/10 flex flex-row justify-between items-center bg-blue-500/5">
                                        <CardTitle className="text-blue-400 flex items-center gap-2 text-base">
                                            <Database className="w-4 h-4" /> Inspecting: {selectedUserTables.uid}
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => { setSelectedUserTables(null); setSelectedTableData(null); }}
                                            className="h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                                        >
                                            Close
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="flex flex-wrap gap-3 mb-6">
                                            {selectedUserTables.tables.map((table) => (
                                                <button
                                                    key={table}
                                                    onClick={() => inspectTableData(selectedUserTables.uid, table)}
                                                    className={`px-4 py-2 rounded-md border text-sm font-mono transition-all ${selectedTableData?.tableName === table ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                                                >
                                                    {table}
                                                </button>
                                            ))}
                                        </div>

                                        {selectedTableData && (
                                            <div className="bg-black/50 rounded-lg border border-white/5 overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader className="bg-white/5">
                                                            <TableRow className="border-white/10">
                                                                {selectedTableData.rows.length > 0 ? Object.keys(selectedTableData.rows[0]).map((key) => (
                                                                    <TableHead key={key} className="text-blue-300 whitespace-nowrap py-2">{key}</TableHead>
                                                                )) : <TableHead className="text-slate-400 py-2">Data</TableHead>}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {selectedTableData.rows.map((row, i) => (
                                                                <TableRow key={i} className="border-white/5 hover:bg-white/5">
                                                                    {Object.values(row).map((val: any, j) => (
                                                                        <TableCell key={j} className="text-xs text-slate-300 whitespace-nowrap py-2">
                                                                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                            {selectedTableData.rows.length === 0 && (
                                                                <TableRow>
                                                                    <TableCell className="text-center text-slate-500 py-6">Table is empty</TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeTab === 'categories' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Global Categories</h2>
                                <p className="text-slate-400 mt-1">Manage the built-in expense categories available to all users.</p>
                            </div>

                            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                                <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Tag className="w-5 h-5 text-amber-400" /> Expense Categories
                                        </CardTitle>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <Input placeholder="New category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="bg-black/50 border-white/10 text-slate-200 h-9 w-full sm:w-48" />
                                            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()} className="h-9 bg-amber-500 hover:bg-amber-600 text-amber-950 font-medium">
                                                <Plus className="w-4 h-4 mr-1" /> Add
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-white/10 hover:bg-transparent">
                                                <TableHead className="text-slate-400">ID</TableHead>
                                                <TableHead className="text-slate-400 w-full">Category Name</TableHead>
                                                <TableHead className="text-slate-400 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {categories.map((cat) => (
                                                <TableRow key={cat.id} className="border-white/5 hover:bg-white/[0.04]">
                                                    <TableCell className="text-slate-500 font-mono text-xs">{cat.id}</TableCell>
                                                    <TableCell>
                                                        {editingCategory === cat.id ? (
                                                            <Input value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} className="h-8 bg-black/50 border-white/20 text-white max-w-[200px]" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory(cat.id)} />
                                                        ) : (
                                                            <span className="font-medium text-slate-200">{cat.name}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            {editingCategory === cat.id ? (
                                                                <>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleUpdateCategory(cat.id)} className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"><Check className="w-4 h-4" /></Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => setEditingCategory(null)} className="h-8 w-8 p-0 text-slate-400 hover:text-slate-300 hover:bg-white/10"><X className="w-4 h-4" /></Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button variant="ghost" size="sm" onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.name); }} className="h-8 w-8 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"><Edit2 className="w-4 h-4" /></Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(cat.id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {categories.length === 0 && (
                                                <TableRow><TableCell colSpan={3} className="text-center text-slate-500 py-8">No categories found.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
