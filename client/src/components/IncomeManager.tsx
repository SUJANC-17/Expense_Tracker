import { useState } from 'react';
import type { Income } from '../appTypes';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface IncomeManagerProps {
  incomes: Income[];
  userId: string;
  onAdd: (income: Omit<Income, 'id'>) => void;
  onUpdate: (id: number, income: Partial<Income>) => void;
  onDelete: (id: number) => void;
}

export function IncomeManager({ incomes, userId, onAdd, onUpdate, onDelete }: IncomeManagerProps) {
  const [open, setOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    source: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIncome) {
      onUpdate(editingIncome.id, {
        amount: parseFloat(formData.amount),
        source: formData.source,
        description: formData.description,
        date: formData.date,
      });
    } else {
      onAdd({
        userId,
        amount: parseFloat(formData.amount),
        source: formData.source,
        description: formData.description,
        date: formData.date,
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      source: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setEditingIncome(null);
    setOpen(false);
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setFormData({
      amount: income.amount.toString(),
      source: income.source,
      description: income.description,
      date: income.date,
    });
    setOpen(true);
  };

  const sortedIncomes = [...incomes].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white mb-2">Income Management</h2>
          <p className="text-gray-400">Track all your income sources</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Income
            </Button>
          </DialogTrigger>
          <DialogContent className="backdrop-blur-xl bg-slate-900/95 border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingIncome ? 'Edit Income' : 'Add New Income'}
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
                <Label htmlFor="source" className="text-gray-300">Source</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  required
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="e.g., Salary, Freelance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-300">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Optional notes..."
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
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {editingIncome ? 'Update' : 'Add'}
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
          <CardTitle className="text-white">Income History</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedIncomes.length > 0 ? (
            <div className="space-y-3">
              {sortedIncomes.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-400">₹{income.amount.toFixed(2)}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-white">{income.source}</span>
                    </div>
                    {income.description && (
                      <p className="text-sm text-gray-400">{income.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(income.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(income)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(income.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No income records yet. Add your first income!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
