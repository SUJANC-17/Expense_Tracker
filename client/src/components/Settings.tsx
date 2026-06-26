import { useEffect, useState } from 'react';
import type { Budget, BudgetPeriodType, Category, Expense, Income, Split } from '../appTypes';
import { formatBudgetPeriodLabel } from '../utils/budget';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { SettingsReportsPage } from './SettingsReports';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';

type SettingsSection = 'budget' | 'reports';

interface SettingsProps {
    budgets: Budget[];
    saveBudget: (periodType: BudgetPeriodType, amount: number) => Promise<Budget>;
    removeBudget: (id: number) => Promise<void>;
    section: SettingsSection;
    onSectionChange: (section: SettingsSection) => void;
    incomes: Income[];
    expenses: Expense[];
    splits: Split[];
    categories: Category[];
}

const BUDGET_CONFIGS: Array<{ periodType: BudgetPeriodType; title: string; description: string; }> = [
    { periodType: 'daily', title: 'Daily Budget', description: 'Track how much you want to spend each day.' },
    { periodType: 'weekly', title: 'Weekly Budget', description: 'Set a limit for the current week.' },
    { periodType: 'monthly', title: 'Monthly Budget', description: 'Manage a bigger budget across the month.' },
];

export function SettingsPage({
    budgets,
    saveBudget,
    removeBudget,
    section,
    onSectionChange,
    incomes,
    expenses,
    splits,
    categories,
}: SettingsProps) {
    const activeBudgets = budgets.filter((budget) => budget.isActive);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="mb-2 text-white">Settings</h2>
                    <p className="text-gray-400">Manage budgets and reports</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant={section === 'budget' ? 'default' : 'outline'}
                        onClick={() => onSectionChange('budget')}
                        className={section === 'budget' ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'}
                    >
                        Budget
                    </Button>
                    <Button
                        type="button"
                        variant={section === 'reports' ? 'default' : 'outline'}
                        onClick={() => onSectionChange('reports')}
                        className={section === 'reports' ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'}
                    >
                        Reports
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="border-white/20 bg-white/10 backdrop-blur-xl md:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-white">Active Budgets</CardTitle>
                            <p className="text-sm text-gray-400">Currently configured</p>
                        </div>
                        <AlertTriangle className="h-5 w-5 text-amber-300" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl text-white">{activeBudgets.length}</p>
                        <p className="mt-1 text-xs text-gray-400">Set daily, weekly, and monthly budgets independently.</p>
                    </CardContent>
                </Card>
            </div>

            {section === 'budget' ? (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-white">Budget</h3>
                        <p className="text-sm text-gray-400">Set, update, or clear each budget period independently.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {BUDGET_CONFIGS.map((config) => {
                            const budget = activeBudgets.find((item) => item.periodType === config.periodType) || null;
                            return (
                                <BudgetCard
                                    key={config.periodType}
                                    periodType={config.periodType}
                                    title={config.title}
                                    description={config.description}
                                    budget={budget}
                                    onSave={saveBudget}
                                    onRemove={removeBudget}
                                />
                            );
                        })}
                    </div>
                </div>
            ) : (
                <SettingsReportsPage
                    budgets={budgets}
                    incomes={incomes}
                    expenses={expenses}
                    splits={splits}
                    categories={categories}
                    onBackToBudget={() => onSectionChange('budget')}
                />
            )}
        </div>
    );
}

function BudgetCard({
    periodType,
    title,
    description,
    budget,
    onSave,
    onRemove,
}: {
    periodType: BudgetPeriodType;
    title: string;
    description: string;
    budget: Budget | null;
    onSave: (periodType: BudgetPeriodType, amount: number) => Promise<Budget>;
    onRemove: (id: number) => Promise<void>;
}) {
    const [isEditing, setIsEditing] = useState(!budget);
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        if (budget) {
            setAmount(budget.amount.toString());
            setIsEditing(false);
        } else {
            setAmount('');
            setIsEditing(true);
        }
        setError('');
    }, [budget?.id, budget?.amount]);

    const handleSave = async () => {
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError('Enter an amount greater than 0');
            return;
        }

        setSaving(true);
        setError('');
        try {
            await onSave(periodType, parsedAmount);
            setIsEditing(false);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Failed to save budget');
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async () => {
        if (!budget) return;
        setRemoving(true);
        setError('');
        try {
            await onRemove(budget.id);
            setAmount('');
            setIsEditing(true);
        } catch (removeError) {
            const message = removeError instanceof Error ? removeError.message : 'Failed to remove budget';
            setError(message);
        } finally {
            setRemoving(false);
        }
    };

    return (
        <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
            <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-white">{title}</CardTitle>
                        <p className="text-sm text-gray-400">{description}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs text-gray-300">
                        {formatBudgetPeriodLabel(periodType)}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {budget && !isEditing ? (
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Current budget</p>
                            <p className="mt-2 text-2xl text-white">₹{budget.amount.toFixed(2)}</p>
                            <p className="mt-1 text-xs text-gray-400">Saved value for this period</p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditing(true)}
                                className="flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void handleRemove()}
                                disabled={removing}
                                className="border-rose-500/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                            >
                                <Trash2 className="h-4 w-4" />
                                {removing ? 'Removing...' : 'Clear'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label className="text-gray-200">Amount</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                placeholder="Enter amount"
                                className="border-white/15 bg-white/5 text-white"
                            />
                            <p className="text-xs text-gray-400">Amount must be greater than zero.</p>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={saving}
                                className="flex-1 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                            >
                                {saving ? 'Saving...' : budget ? 'Update' : 'Save'}
                            </Button>
                            {budget && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setAmount(budget.amount.toString());
                                        setError('');
                                        setIsEditing(false);
                                    }}
                                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
