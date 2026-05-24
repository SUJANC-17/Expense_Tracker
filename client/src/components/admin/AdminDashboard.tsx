import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Trash2, Database, Lock, LogOut, Users } from 'lucide-react';
import { adminApi } from '../../utils/adminApi';

export default function AdminDashboard() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedUserTables, setSelectedUserTables] = useState<{ uid: string, tables: string[] } | null>(null);
    const [selectedTableData, setSelectedTableData] = useState<{ tableName: string, rows: any[] } | null>(null);

    // Filter states
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [dataLoading, setDataLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            fetchUsers();
        }
    }, [isLoggedIn]);

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
        setEmail('');
        setPin('');
        setUsers([]);
        setSelectedUserTables(null);
        setSelectedTableData(null);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await adminApi.get('/admin/users');
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users');
            // Check if it was an auth error
            if (!localStorage.getItem('admin_token')) {
                setIsLoggedIn(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const inspectTables = async (uid: string) => {
        try {
            const tables = await adminApi.get(`/admin/users/${uid}/tables`);
            setSelectedUserTables({ uid, tables });
            setSelectedTableData(null);
        } catch (err) {
            alert('Failed to fetch tables');
        }
    };

    const inspectTableData = async (uid: string, tableName: string) => {
        setDataLoading(true);
        try {
            const res = await adminApi.get(`/admin/users/${uid}/tables/${tableName}/data`);
            setSelectedTableData({ tableName, rows: res.data });

            // Fetch categories if inspecting expenses table
            if (tableName.includes('expenses') && categories.length === 0) {
                fetchCategories();
            }

            // Reset filters
            setCategoryFilter('');
            setStartDate('');
            setEndDate('');
        } catch (err) {
            console.error('Error fetching table data:', err);
        } finally {
            setDataLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await adminApi.get('/admin/categories');
            setCategories(res);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const deleteUser = async (uid: string, userEmail: string) => {
        if (!confirm(`Are you sure you want to permanently delete user ${userEmail}? This will export their data and wipe everything.`)) return;

        try {
            await adminApi.delete(`/admin/users/${uid}`);
            alert('Wipe process started. User record and data will be removed.');
            fetchUsers();
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
                <Card className="w-full max-w-md backdrop-blur-xl bg-white/10 border-white/20">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                            <Lock className="w-6 h-6 text-red-400" />
                        </div>
                        <CardTitle className="text-white">Admin Access</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="email"
                                    placeholder="Admin Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-white/5 border-white/10 text-slate-200"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="PIN"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className="bg-white/5 border-white/10 text-slate-200"
                                    required
                                />
                            </div>
                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                                Unlock Portal
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6 text-slate-200">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <Users className="w-6 h-6 text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold">Admin Portal</h1>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="border-white/10 hover:bg-white/5">
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </div>

                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" /> Registered Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-gray-400">User Email</TableHead>
                                    <TableHead className="text-gray-400">UID</TableHead>
                                    <TableHead className="text-gray-400">Last Active</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                                        <TableCell className="font-medium">{user.email}</TableCell>
                                        <TableCell className="text-gray-400 text-xs font-mono">{user.id}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs font-normal border-white/10">
                                                {user.last_active_at ? new Date(user.last_active_at).toLocaleString() : 'Never'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => inspectTables(user.id)}
                                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                >
                                                    <Database className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteUser(user.id, user.email)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {selectedUserTables && (
                    <Card className="bg-white/5 border-blue-500/30 border">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle className="text-blue-400 flex items-center gap-2">
                                <Database className="w-5 h-5" /> Tables for {selectedUserTables.uid}
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedUserTables(null)}>Close</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {selectedUserTables.tables.map(table => (
                                    <button
                                        key={table}
                                        onClick={() => inspectTableData(selectedUserTables.uid, table)}
                                        className="p-3 bg-white/5 rounded border border-white/10 text-xs font-mono hover:bg-white/10 text-left transition-colors"
                                    >
                                        {table}
                                        <span className="block text-gray-500 mt-1 text-[10px]">Click to inspect</span>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {selectedTableData && (
                    <Card className="bg-white/5 border-green-500/30 border">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle className="text-green-400 flex items-center gap-2 text-sm font-mono">
                                {selectedTableData.tableName}
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedTableData(null)}>Close Data</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Filter Controls */}
                            <div className="flex flex-wrap gap-3 p-3 bg-white/5 rounded border border-white/10">
                                {selectedTableData.tableName.includes('expenses') && categories.length > 0 && (
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-xs text-gray-400 mb-1 block">Category</label>
                                        <select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                            className="w-full bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-slate-200"
                                        >
                                            <option value="">All Categories</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {selectedTableData.rows.length > 0 && selectedTableData.rows[0].date && (
                                    <>
                                        <div className="flex-1 min-w-[150px]">
                                            <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
                                            <Input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="bg-white/10 border-white/10 text-slate-200 text-sm"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-[150px]">
                                            <label className="text-xs text-gray-400 mb-1 block">End Date</label>
                                            <Input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="bg-white/10 border-white/10 text-slate-200 text-sm"
                                            />
                                        </div>
                                    </>
                                )}

                                {(categoryFilter || startDate || endDate) && (
                                    <div className="flex items-end">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setCategoryFilter('');
                                                setStartDate('');
                                                setEndDate('');
                                            }}
                                            className="border-white/10 hover:bg-white/5 text-xs"
                                        >
                                            Clear Filters
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Table Data */}
                            <div className="overflow-x-auto">
                                {(() => {
                                    // Apply filters
                                    let filteredRows = selectedTableData.rows;

                                    // Client-side filtering only - safe from SQL injection
                                    // Category filter
                                    if (categoryFilter && selectedTableData.tableName.includes('expenses')) {
                                        filteredRows = filteredRows.filter(row =>
                                            row.category_id?.toString() === categoryFilter
                                        );
                                    }

                                    // Date range filter
                                    if (startDate || endDate) {
                                        filteredRows = filteredRows.filter(row => {
                                            if (!row.date) return true;
                                            const rowDate = new Date(row.date).toISOString().split('T')[0];
                                            if (startDate && rowDate < startDate) return false;
                                            if (endDate && rowDate > endDate) return false;
                                            return true;
                                        });
                                    }

                                    return filteredRows.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-white/10">
                                                    {Object.keys(filteredRows[0]).map(key => (
                                                        <TableHead key={key} className="text-gray-400 whitespace-nowrap">{key}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredRows.map((row, i) => (
                                                    <TableRow key={i} className="border-white/5 hover:bg-white/5">
                                                        {Object.values(row).map((val: any, j) => (
                                                            <TableCell key={j} className="text-xs text-white whitespace-nowrap">
                                                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-gray-400 text-center py-4">
                                            {selectedTableData.rows.length === 0 ? 'Table is empty' : 'No records match the filters'}
                                        </p>
                                    );
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
