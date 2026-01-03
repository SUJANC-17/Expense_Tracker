import { useState } from 'react';
import type { Expense } from '../appTypes';
import { CATEGORIES, getCategoryName } from '../utils/categories';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface ExpenseManagerProps {
  expenses: Expense[];
  userId: string;
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  onUpdate: (id: number, expense: Partial<Expense>) => void;
  onDelete: (id: number) => void;
}

export function ExpenseManager({ expenses, userId, onAdd, onUpdate, onDelete }: ExpenseManagerProps) {
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '1',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExpense) {
      onUpdate(editingExpense.id, {
        amount: parseFloat(formData.amount),
        categoryId: parseInt(formData.categoryId),
        description: formData.description,
        date: formData.date,
      });
    } else {
      onAdd({
        userId,
        amount: parseFloat(formData.amount),
        categoryId: parseInt(formData.categoryId),
        description: formData.description,
        date: formData.date,
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      categoryId: '1',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setEditingExpense(null);
    setOpen(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      categoryId: expense.categoryId.toString(),
      description: expense.description,
      date: expense.date,
    });
    setOpen(true);
  };

  const sortedExpenses = [...expenses].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white mb-2">Expense Management</h2>
          <p className="text-gray-400">Track and categorize your expenses</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="backdrop-blur-xl bg-slate-900/95 border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-gray-300">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-gray-300">Category</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20">
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()} className="text-white">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="What did you spend on?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-gray-300">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                >
                  {editingExpense ? 'Update' : 'Add'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="border-white/20 text-white hover:bg-white/10">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedExpenses.length > 0 ? (
            <div className="space-y-3">
              {sortedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-red-400">₹{expense.amount.toFixed(2)}</span>
                      <span className="text-gray-500">•</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {getCategoryName(expense.categoryId)}
                      </span>
                    </div>
                    {expense.description && (
                      <p className="text-sm text-gray-300">{expense.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(expense)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(expense.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No expenses yet. Start tracking your spending!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
