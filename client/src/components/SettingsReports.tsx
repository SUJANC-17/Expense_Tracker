import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '../utils/api';
import type { Budget, BudgetPeriodType, BudgetSavingsResponse, Category, Expense, Income, Split } from '../appTypes';
import { getCategoryName } from '../utils/categories';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileText, Loader2, ArrowLeft, Settings2 } from 'lucide-react';

interface SettingsReportsProps {
    budgets: Budget[];
    incomes: Income[];
    expenses: Expense[];
    splits: Split[];
    categories: Category[];
    onBackToBudget: () => void;
}

const BUDGET_ORDER: BudgetPeriodType[] = ['daily', 'weekly', 'monthly'];

function getBudgetTitle(periodType: BudgetPeriodType) {
    if (periodType === 'daily') return 'Daily budget';
    if (periodType === 'weekly') return 'Weekly budget';
    return 'Monthly budget';
}

export function SettingsReportsPage({ budgets, incomes, expenses, splits, categories, onBackToBudget }: SettingsReportsProps) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const [selectedYear, setSelectedYear] = useState(currentYear.toString());
    const [selectedMonth, setSelectedMonth] = useState((currentMonth + 1).toString());
    const [isGenerating, setIsGenerating] = useState(false);
    const [savingsPeriod, setSavingsPeriod] = useState<BudgetPeriodType | ''>('');
    const [savingsRange, setSavingsRange] = useState<'week' | 'month' | 'both'>('both');
    const [savingsLoading, setSavingsLoading] = useState(false);
    const [savingsError, setSavingsError] = useState('');
    const [savingsData, setSavingsData] = useState<BudgetSavingsResponse | null>(null);

    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const activeBudgets = useMemo(
        () =>
            [...budgets]
                .filter((budget) => budget.isActive)
                .sort((a, b) => BUDGET_ORDER.indexOf(a.periodType) - BUDGET_ORDER.indexOf(b.periodType)),
        [budgets],
    );

    const report = useMemo(() => {
        const year = parseInt(selectedYear, 10);
        const month = parseInt(selectedMonth, 10) - 1;

        const filteredIncomes = incomes.filter((income) => {
            const date = new Date(income.date);
            return date.getFullYear() === year && date.getMonth() === month;
        });

        const filteredExpenses = expenses.filter((expense) => {
            const date = new Date(expense.date);
            return date.getFullYear() === year && date.getMonth() === month;
        });

        const filteredSplits = splits.filter((split) => {
            const date = new Date(split.date);
            return date.getFullYear() === year && date.getMonth() === month && !split.isPaid;
        });

        const totalIncome = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);
        const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalUnpaidSplits = filteredSplits.reduce((sum, split) => sum + split.amount, 0);
        const balance = totalIncome - totalExpenses;

        const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
            const categoryName = getCategoryName(expense.categoryId, categories);
            acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
            return acc;
        }, {} as Record<string, number>);

        return {
            year,
            month,
            monthName: months[month],
            totalIncome,
            totalExpenses,
            balance,
            expensesByCategory,
            unpaidSplits: filteredSplits,
            totalUnpaidSplits,
            incomeCount: filteredIncomes.length,
            expenseCount: filteredExpenses.length,
        };
    }, [selectedYear, selectedMonth, incomes, expenses, splits, categories]);

    useEffect(() => {
        if (!activeBudgets.length) {
            setSavingsPeriod('');
            setSavingsData(null);
            setSavingsError('');
            return;
        }

        setSavingsPeriod((current) => {
            if (current && activeBudgets.some((budget) => budget.periodType === current)) {
                return current;
            }

            return activeBudgets[0].periodType;
        });
    }, [activeBudgets]);

    useEffect(() => {
        if (!savingsPeriod) {
            setSavingsData(null);
            return;
        }

        let cancelled = false;

        const loadSavings = async () => {
            setSavingsLoading(true);
            setSavingsError('');
            try {
                const params = new URLSearchParams({
                    period_type: savingsPeriod,
                    range: savingsRange,
                });

                const data = await apiClient.get(`/budgets/savings?${params.toString()}`) as BudgetSavingsResponse;
                if (!cancelled) {
                    setSavingsData(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setSavingsData(null);
                    const message = error instanceof Error ? error.message : 'Failed to load savings';
                    setSavingsError(message);
                    if (!message.toLowerCase().includes('not found') && !message.includes('404')) {
                        toast.error('Could not load budget savings');
                    }
                }
            } finally {
                if (!cancelled) setSavingsLoading(false);
            }
        };

        loadSavings();

        return () => {
            cancelled = true;
        };
    }, [savingsPeriod, savingsRange]);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        try {
            await apiClient.post('/reports/send', {
                year: report.year,
                month: report.month + 1,
            });
            toast.success(`Report for ${report.monthName} ${report.year} has been emailed.`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate/send report');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="mb-2 text-white">Reports</h2>
                    <p className="text-gray-400">Monthly reports now live inside Settings</p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={onBackToBudget}
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Budget
                </Button>
            </div>

            <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-white">Select Period</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <p className="text-sm text-gray-400">Year</p>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="border-white/20 bg-white/10 text-white">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent className="border-white/20 bg-slate-900 text-white">
                                    {years.map((year) => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-gray-400">Month</p>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="border-white/20 bg-white/10 text-white">
                                    <SelectValue placeholder="Select Month" />
                                </SelectTrigger>
                                <SelectContent className="border-white/20 bg-slate-900 text-white">
                                    {months.map((month, index) => (
                                        <SelectItem key={month} value={(index + 1).toString()}>
                                            {month}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-white">
                        {report.monthName} {report.year} Report
                    </CardTitle>
                    <Button
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        {isGenerating ? 'Sending...' : 'Send to Email'}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <MetricCard label="Total Income" value={`₹${report.totalIncome.toFixed(2)}`} tone="text-green-400" meta={`${report.incomeCount} transactions`} />
                        <MetricCard label="Total Expenses" value={`₹${report.totalExpenses.toFixed(2)}`} tone="text-red-400" meta={`${report.expenseCount} transactions`} />
                        <MetricCard
                            label="Balance"
                            value={`₹${report.balance.toFixed(2)}`}
                            tone={report.balance >= 0 ? 'text-green-400' : 'text-red-400'}
                            meta={report.balance >= 0 ? 'Surplus' : 'Deficit'}
                        />
                    </div>

                    <div>
                        <h4 className="mb-3 text-white">Expenses by Category</h4>
                        {Object.keys(report.expensesByCategory).length > 0 ? (
                            <div className="space-y-2">
                                {Object.entries(report.expensesByCategory)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([category, amount]) => {
                                        const percentage = report.totalExpenses > 0
                                            ? ((amount / report.totalExpenses) * 100).toFixed(1)
                                            : '0';
                                        return (
                                            <div key={category} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-300">{category}</span>
                                                    <span className="text-xs text-gray-500">{percentage}%</span>
                                                </div>
                                                <span className="text-white">₹{amount.toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <p className="rounded-lg bg-white/5 py-4 text-center text-gray-400">
                                No expenses recorded for this period
                            </p>
                        )}
                    </div>

                    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-gray-400">Cumulative Savings</p>
                                <p className="text-base font-medium text-white">Tracked before split expenses</p>
                            </div>
                            <Settings2 className="h-5 w-5 text-cyan-300" />
                        </div>

                        {activeBudgets.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Budget type</p>
                                        {activeBudgets.length > 1 ? (
                                            <Select value={savingsPeriod || activeBudgets[0].periodType} onValueChange={(value) => setSavingsPeriod(value as BudgetPeriodType)}>
                                                <SelectTrigger className="border-white/15 bg-white/5 text-white">
                                                    <SelectValue placeholder="Select budget" />
                                                </SelectTrigger>
                                                <SelectContent className="border-white/15 bg-slate-950 text-white">
                                                    {activeBudgets.map((budget) => (
                                                        <SelectItem key={budget.id} value={budget.periodType}>
                                                            {getBudgetTitle(budget.periodType)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                                                {getBudgetTitle(activeBudgets[0].periodType)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Range</p>
                                        <Select value={savingsRange} onValueChange={(value) => setSavingsRange(value as 'week' | 'month' | 'both')}>
                                            <SelectTrigger className="border-white/15 bg-white/5 text-white">
                                                <SelectValue placeholder="Select range" />
                                            </SelectTrigger>
                                            <SelectContent className="border-white/15 bg-slate-950 text-white">
                                                <SelectItem value="week">Week</SelectItem>
                                                <SelectItem value="month">Month</SelectItem>
                                                <SelectItem value="both">Both</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {savingsLoading ? (
                                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading cumulative savings...
                                    </div>
                                ) : savingsError ? (
                                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                                        {savingsError.includes('404')
                                            ? 'Set a budget in Settings to start tracking savings.'
                                            : savingsError}
                                    </div>
                                ) : savingsData?.week && savingsData?.month && savingsRange === 'both' ? (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <SavingsCard label="Week" payload={savingsData.week} />
                                        <SavingsCard label="Month" payload={savingsData.month} />
                                    </div>
                                ) : savingsData?.savings !== undefined && savingsData?.budget !== undefined ? (
                                    <SavingsCard
                                        label={savingsRange === 'week' ? 'Week' : savingsRange === 'month' ? 'Month' : 'Both'}
                                        payload={{
                                            savings: savingsData.savings ?? 0,
                                            budget: savingsData.budget ?? 0,
                                            range_label: savingsData.range_label || 'Selected range',
                                        }}
                                    />
                                ) : (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                                        Set a budget in Settings to start tracking savings.
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-sm text-gray-300">
                                <p>Set a budget in Settings to start tracking savings.</p>
                            </div>
                        )}
                    </div>

                    {report.unpaidSplits.length > 0 && (
                        <div>
                            <h4 className="mb-3 text-white">Unpaid Split Expenses</h4>
                            <div className="space-y-2">
                                {report.unpaidSplits.map((split) => (
                                    <div
                                        key={split.id}
                                        className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/10 p-3"
                                    >
                                        <div>
                                            <span className="text-white">{split.friendName}</span>
                                            {split.description && (
                                                <p className="text-sm text-gray-400">{split.description}</p>
                                            )}
                                        </div>
                                        <span className="text-orange-400">₹{split.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-500/20 p-3">
                                    <span className="text-white">Total Unpaid</span>
                                    <span className="text-orange-400">₹{report.totalUnpaidSplits.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function MetricCard({
    label,
    value,
    tone,
    meta,
}: {
    label: string;
    value: string;
    tone: string;
    meta: string;
}) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="mb-1 text-sm text-gray-400">{label}</p>
            <p className={tone}>{value}</p>
            <p className="mt-1 text-xs text-gray-500">{meta}</p>
        </div>
    );
}

function SavingsCard({
    label,
    payload,
}: {
    label: string;
    payload: { savings: number; budget: number; range_label: string };
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{payload.range_label}</p>
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                    Cumulative
                </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                    <p className="text-xs text-gray-500">Savings</p>
                    <p className="mt-1 text-base font-semibold text-emerald-300">₹{payload.savings.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="mt-1 text-base font-semibold text-white">₹{payload.budget.toFixed(2)}</p>
                </div>
            </div>
        </div>
    );
}
