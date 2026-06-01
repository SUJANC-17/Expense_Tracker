import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { Income, Expense, Split } from '../appTypes';
import { getCategoryName } from '../utils/categories';
import { DollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react';
import CountUp from 'react-countup';

interface DashboardProps {
  incomes: Income[];
  expenses: Expense[];
  splits: Split[];
}

export function Dashboard({ incomes, expenses, splits }: DashboardProps) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const summary = useMemo(() => {
    const currentIncomes = incomes.filter((income) => {
      const date = new Date(income.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const currentExpenses = expenses.filter((expense) => {
      const date = new Date(expense.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const currentUnpaidSplits = splits.filter((split) => {
      const date = new Date(split.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear && !split.isPaid;
    });

    const totalIncome = currentIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = currentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalUnpaid = currentUnpaidSplits.reduce((sum, split) => sum + split.amount, 0);

    const allTimeIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const allTimeExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const allTimeSplitOut = splits.reduce((sum, split) => sum + split.amount, 0);
    const allTimeSplitIn = splits.filter((split) => split.isPaid).reduce((sum, split) => sum + split.amount, 0);
    const balance = allTimeIncome - allTimeExpenses - allTimeSplitOut + allTimeSplitIn;

    const expensesByCategory = currentExpenses.reduce((acc, expense) => {
      const categoryName = getCategoryName(expense.categoryId);
      acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalIncome,
      totalExpenses,
      balance,
      expensesByCategory,
      unpaidSplits: currentUnpaidSplits,
      totalUnpaid,
    };
  }, [incomes, expenses, splits, currentMonth, currentYear]);

  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white mb-2">Dashboard - {monthName} {currentYear}</h2>
        <p className="text-gray-400">Overview of your current month finances</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-300">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl ${summary.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <CountUp end={summary.balance} prefix="₹" decimals={2} duration={2} preserveValue={true} />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {summary.balance >= 0 ? 'Surplus, carried forward' : 'Deficit, carried forward'}
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-300">Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-400">
              <CountUp end={summary.totalIncome} prefix="₹" decimals={2} duration={2} preserveValue={true} />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-300">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-400">
              <CountUp end={summary.totalExpenses} prefix="₹" decimals={2} duration={2} preserveValue={true} />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
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
              <p className="text-gray-400 text-center py-4">No expenses this month</p>
            )}
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-white">Unpaid Split Expenses</CardTitle>
            <Users className="h-5 w-5 text-orange-400" />
          </CardHeader>
          <CardContent>
            {summary.unpaidSplits.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-gray-300">Total Unpaid</span>
                  <span className="text-orange-400 font-bold">
                    <CountUp end={summary.totalUnpaid} prefix="₹" decimals={2} duration={2} preserveValue={true} />
                  </span>
                </div>
                {summary.unpaidSplits.slice(0, 3).map((split) => (
                  <div key={split.id} className="flex items-center justify-between">
                    <span className="text-gray-300">{split.friendName}</span>
                    <span className="text-white">₹{split.amount.toFixed(2)}</span>
                  </div>
                ))}
                {summary.unpaidSplits.length > 3 && (
                  <p className="text-gray-400 text-sm text-center pt-2">
                    +{summary.unpaidSplits.length - 3} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">All splits are paid!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
