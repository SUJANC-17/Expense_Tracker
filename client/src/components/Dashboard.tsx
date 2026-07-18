import { useMemo } from 'react';
import type { Budget, BudgetPeriodType, Category, Expense, Income, Split } from '../appTypes';
import { getCategoryName } from '../utils/categories';
import { formatBudgetPeriodLabel, getBudgetPeriodSpent } from '../utils/budget';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { DollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react';
import CountUp from 'react-countup';

interface DashboardProps {
  incomes: Income[];
  expenses: Expense[];
  splits: Split[];
  budgets: Budget[];
  categories: Category[];
}

interface UnpaidSplitBalance {
  key: string;
  friendId: number | null;
  friendName: string;
  outstandingAmount: number;
  splitCount: number;
}

const BUDGET_ORDER: BudgetPeriodType[] = ['daily', 'weekly', 'monthly'];

function getBudgetTitle(periodType: BudgetPeriodType) {
  if (periodType === 'daily') return 'Daily budget';
  if (periodType === 'weekly') return 'Weekly budget';
  return 'Monthly budget';
}

export function Dashboard({ incomes, expenses, splits, budgets, categories }: DashboardProps) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const activeBudgets = useMemo(
    () =>
      [...budgets]
        .filter((budget) => budget.isActive)
        .sort((a, b) => BUDGET_ORDER.indexOf(a.periodType) - BUDGET_ORDER.indexOf(b.periodType)),
    [budgets],
  );

  const summary = useMemo(() => {
    const currentIncomes = incomes.filter((income) => {
      const date = new Date(income.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const currentExpenses = expenses.filter((expense) => {
      const date = new Date(expense.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // All-time unpaid splits (not restricted to current month)
    const currentUnpaidSplits = splits.filter((split) => !split.isPaid);

    const unpaidSplitBalances = Array.from(
      currentUnpaidSplits.reduce((balances, split) => {
        const key =
          split.friendId !== null && split.friendId !== undefined
            ? `friend:${split.friendId}`
            : `name:${split.friendName.trim().toLowerCase() || 'unknown'}`;

        const existing = balances.get(key) || {
          key,
          friendId: split.friendId ?? null,
          friendName: split.friendName?.trim() || 'Unknown',
          outstandingAmount: 0,
          splitCount: 0,
        };

        existing.outstandingAmount += split.amount;
        existing.splitCount += 1;
        balances.set(key, existing);
        return balances;
      }, new Map<string, UnpaidSplitBalance>()).values(),
    ).sort((a, b) => b.outstandingAmount - a.outstandingAmount || a.friendName.localeCompare(b.friendName));

    const totalIncome = currentIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = currentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalUnpaid = unpaidSplitBalances.reduce((sum, split) => sum + split.outstandingAmount, 0);

    const allTimeIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const allTimeExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const allTimeSplitOut = splits.reduce((sum, split) => sum + split.amount, 0);
    const allTimeSplitIn = splits.filter((split) => split.isPaid).reduce((sum, split) => sum + split.amount, 0);
    const balance = allTimeIncome - allTimeExpenses - allTimeSplitOut + allTimeSplitIn;

    const expensesByCategory = currentExpenses.reduce((acc, expense) => {
      const categoryName = getCategoryName(expense.categoryId, categories);
      acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalIncome,
      totalExpenses,
      balance,
      expensesByCategory,
      unpaidSplitBalances,
      totalUnpaid,
    };
  }, [incomes, expenses, splits, categories, currentMonth, currentYear]);

  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-white">Dashboard - {monthName} {currentYear}</h2>
        <p className="text-gray-400">Overview of your current month finances</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-300">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl ${summary.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <CountUp end={summary.balance} prefix="₹" decimals={2} duration={2} preserveValue />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {summary.balance >= 0 ? 'Surplus, carried forward' : 'Deficit, carried forward'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-300">Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-400">
              <CountUp end={summary.totalIncome} prefix="₹" decimals={2} duration={2} preserveValue />
            </div>
            <p className="mt-1 text-xs text-gray-400">This month</p>
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-300">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-400">
              <CountUp end={summary.totalExpenses} prefix="₹" decimals={2} duration={2} preserveValue />
            </div>
            <p className="mt-1 text-xs text-gray-400">This month</p>
          </CardContent>
        </Card>
      </div>

      {activeBudgets.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-white">Budget Progress</h3>
            <p className="text-sm text-gray-400">Current period spending against each active budget</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {activeBudgets.map((budget) => {
              const spent = getBudgetPeriodSpent(expenses, budget.periodType);
              const progress = budget.amount > 0 ? Math.min(100, (spent / budget.amount) * 100) : 0;
              const overBudget = spent > budget.amount;

              return (
                <Card key={budget.id} className="border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl">
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base text-white">{getBudgetTitle(budget.periodType)}</CardTitle>
                      <p className="mt-1 text-xs text-gray-400">{formatBudgetPeriodLabel(budget.periodType)}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs text-gray-300">
                      Active
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className={`text-lg font-semibold ${overBudget ? 'text-rose-300' : 'text-emerald-300'}`}>
                        ₹{spent.toFixed(2)} / ₹{budget.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">{overBudget ? 'Over budget' : 'Within budget'}</p>
                    </div>
                    <Progress value={progress} className={overBudget ? 'bg-rose-500/20' : 'bg-emerald-500/20'} />
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{progress.toFixed(0)}% used</span>
                      <span>
                        {overBudget ? 'Exceeded' : 'Remaining'} ₹{Math.max(0, budget.amount - spent).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(summary.expensesByCategory).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(summary.expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-gray-300">{category}</span>
                      <span className="text-white">₹{amount.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="py-4 text-center text-gray-400">No expenses this month</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-white">Unpaid Split Expenses</CardTitle>
              <p className="mt-1 text-xs text-gray-400">All-time outstanding balance</p>
            </div>
            <Users className="h-5 w-5 text-orange-400" />
          </CardHeader>
          <CardContent>
            {summary.unpaidSplitBalances.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-gray-300">Total Unpaid</span>
                  <span className="font-bold text-orange-400">
                    <CountUp end={summary.totalUnpaid} prefix="₹" decimals={2} duration={2} preserveValue />
                  </span>
                </div>
                {summary.unpaidSplitBalances.slice(0, 3).map((split) => (
                  <div key={split.key} className="flex items-center justify-between">
                    <span className="text-gray-300">{split.friendName}</span>
                    <span className="text-white">₹{split.outstandingAmount.toFixed(2)}</span>
                  </div>
                ))}
                {summary.unpaidSplitBalances.length > 3 && (
                  <p className="pt-2 text-center text-sm text-gray-400">
                    +{summary.unpaidSplitBalances.length - 3} more
                  </p>
                )}
              </div>
            ) : (
              <p className="py-4 text-center text-gray-400">All splits are paid!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
