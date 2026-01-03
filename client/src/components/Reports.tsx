import { useState, useMemo } from 'react';
import type { Income, Expense, Split } from '../appTypes';
import { getCategoryName } from '../utils/categories';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { apiClient } from '../utils/api';

interface ReportsProps {
  incomes: Income[];
  expenses: Expense[];
  splits: Split[];
}

export function Reports({ incomes, expenses, splits }: ReportsProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState((currentMonth + 1).toString());
  const [isGenerating, setIsGenerating] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const report = useMemo(() => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1;

    const filteredIncomes = incomes.filter(i => {
      const date = new Date(i.date);
      return date.getFullYear() === year && date.getMonth() === month;
    });

    const filteredExpenses = expenses.filter(e => {
      const date = new Date(e.date);
      return date.getFullYear() === year && date.getMonth() === month;
    });

    const filteredSplits = splits.filter(s => {
      const date = new Date(s.date);
      return date.getFullYear() === year && date.getMonth() === month && !s.isPaid;
    });

    const totalIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalIncome - totalExpenses;

    const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
      const categoryName = getCategoryName(expense.categoryId);
      acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalUnpaidSplits = filteredSplits.reduce((sum, s) => sum + s.amount, 0);

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
  }, [selectedYear, selectedMonth, incomes, expenses, splits]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await apiClient.post('/reports/send', {
        year: report.year,
        month: report.month + 1
      });
      alert(`Report for ${report.monthName} ${report.year} has been emailed to you.`);
    } catch (error) {
      alert('Failed to generate/send report. Please try again.');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white mb-2">Monthly Reports</h2>
        <p className="text-gray-400">View detailed financial reports by month</p>
      </div>

      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Select Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="text-white">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/20">
                  {months.map((month, index) => (
                    <SelectItem key={month} value={(index + 1).toString()} className="text-white">
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-white">
            {report.monthName} {report.year} Report
          </CardTitle>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {isGenerating ? 'Sending...' : 'Generate PDF'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Total Income</p>
              <p className="text-green-400">₹{report.totalIncome.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{report.incomeCount} transactions</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Total Expenses</p>
              <p className="text-red-400">₹{report.totalExpenses.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{report.expenseCount} transactions</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Balance</p>
              <p className={report.balance >= 0 ? 'text-green-400' : 'text-red-400'}>
                ₹{report.balance.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {report.balance >= 0 ? 'Surplus' : 'Deficit'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-white mb-3">Expenses by Category</h4>
            {Object.keys(report.expensesByCategory).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(report.expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const percentage = report.totalExpenses > 0
                      ? ((amount / report.totalExpenses) * 100).toFixed(1)
                      : '0';
                    return (
                      <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
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
              <p className="text-gray-400 text-center py-4 bg-white/5 rounded-lg">
                No expenses recorded for this period
              </p>
            )}
          </div>

          {report.unpaidSplits.length > 0 && (
            <div>
              <h4 className="text-white mb-3">Unpaid Split Expenses</h4>
              <div className="space-y-2">
                {report.unpaidSplits.map((split) => (
                  <div
                    key={split.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
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
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/20 border border-orange-500/30">
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
