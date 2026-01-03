import { useState, useMemo } from 'react';
import type { Split, Friend } from '../appTypes';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Plus, Pencil, Trash2, Check, Users, User } from 'lucide-react';

interface SplitManagerProps {
  splits: Split[];
  userId: string;
  onAdd: (split: Omit<Split, 'id'>) => void;
  onAddBulk: (bulkData: any) => void;
  onUpdate: (id: number, split: Partial<Split>) => void;
  onDelete: (id: number) => void;
  onMarkPaid: (id: number) => void;
  friends: Friend[];
}

export function SplitManager({ splits, userId, onAdd, onAddBulk, onUpdate, onDelete, onMarkPaid, friends }: SplitManagerProps) {
  const [open, setOpen] = useState(false);
  const [editingSplit, setEditingSplit] = useState<Split | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    selectedFriendIds: [] as number[],
    includeMyself: true,
    customFriendName: '',
  });

  const splitPreview = useMemo(() => {
    const totalAmount = parseFloat(formData.amount) || 0;
    const peopleCount = formData.selectedFriendIds.length + (formData.includeMyself ? 1 : 0) + (formData.customFriendName ? 1 : 0);

    if (peopleCount === 0 || totalAmount === 0) return null;

    const share = totalAmount / peopleCount;
    return {
      share,
      peopleCount,
    };
  }, [formData.amount, formData.selectedFriendIds, formData.includeMyself, formData.customFriendName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);

    if (editingSplit) {
      // Editing is still single-friend for simplicity of existing data
      onUpdate(editingSplit.id, {
        amount,
        description: formData.description,
        date: formData.date,
      });
    } else {
      const share = splitPreview?.share || 0;
      const bulkSplits = [];

      // Friends splits
      formData.selectedFriendIds.forEach(id => {
        const friend = friends.find(f => f.id === id);
        bulkSplits.push({
          friend_id: id,
          friend_name: friend?.name,
          amount: share,
        });
      });

      // Custom friend split
      if (formData.customFriendName) {
        bulkSplits.push({
          friend_name: formData.customFriendName,
          amount: share,
        });
      }

      onAddBulk({
        totalAmount: amount,
        description: formData.description,
        date: formData.date,
        userShare: formData.includeMyself ? share : 0,
        splits: bulkSplits,
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      selectedFriendIds: [],
      includeMyself: true,
      customFriendName: '',
    });
    setEditingSplit(null);
    setOpen(false);
  };

  const handleEdit = (split: Split) => {
    setEditingSplit(split);
    setFormData({
      amount: split.amount.toString(),
      description: split.description,
      date: split.date,
      selectedFriendIds: [], // Editor doesn't support bulk adjustment yet
      includeMyself: false,
      customFriendName: split.friendName,
    });
    setOpen(true);
  };

  const toggleFriend = (id: number) => {
    setFormData(prev => ({
      ...prev,
      selectedFriendIds: prev.selectedFriendIds.includes(id)
        ? prev.selectedFriendIds.filter(fid => fid !== id)
        : [...prev.selectedFriendIds, id]
    }));
  };

  const sortedSplits = [...splits].sort((a, b) => {
    if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const unpaidTotal = splits.filter(s => !s.isPaid).reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white mb-2">Split Expenses</h2>
          <p className="text-gray-400">Track and split bills with your friends</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Split
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-slate-900/95 border-white/20 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingSplit ? 'Edit Split' : 'New Split Trip/Bill'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Who is splitting this?</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    <div
                      onClick={() => setFormData(p => ({ ...p, includeMyself: !p.includeMyself }))}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${formData.includeMyself ? 'bg-orange-500/20 border-orange-500/50' : 'bg-white/5 border-white/10'} border`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-400" />
                        <span>Myself</span>
                      </div>
                      {formData.includeMyself && <Check className="w-4 h-4 text-orange-400" />}
                    </div>

                    {friends.map(friend => (
                      <div
                        key={friend.id}
                        onClick={() => toggleFriend(friend.id)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${formData.selectedFriendIds.includes(friend.id) ? 'bg-blue-500/20 border-blue-500/50' : 'bg-white/5 border-white/10'} border`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-400" />
                          <span>{friend.name}</span>
                        </div>
                        {formData.selectedFriendIds.includes(friend.id) && <Check className="w-4 h-4 text-blue-400" />}
                      </div>
                    ))}
                  </div>

                  {!editingSplit && (
                    <div className="pt-2">
                      <Label htmlFor="customName" className="text-xs text-gray-400">Or add a one-time name</Label>
                      <Input
                        id="customName"
                        value={formData.customFriendName}
                        onChange={(e) => setFormData({ ...formData, customFriendName: e.target.value })}
                        className="bg-white/10 border-white/20 text-white mt-1"
                        placeholder="Enter name..."
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-gray-300">Total Bill Amount</Label>
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
                    <Label htmlFor="date" className="text-gray-300">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="bg-white/10 border-white/20 text-white px-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">What's this for?</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Dinner, Trip, Movie etc."
                  />
                </div>

                {splitPreview && (
                  <Card className="bg-orange-500/10 border-orange-500/20">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-300">Split between {splitPreview.peopleCount} people:</span>
                        <span className="text-orange-400 font-bold">₹{splitPreview.share.toFixed(2)} each</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!splitPreview}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  {editingSplit ? 'Update Split' : 'Split Bill Now'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="border-white/20 text-white hover:bg-white/10">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Recent Splits</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedSplits.length > 0 ? (
                <div className="space-y-3">
                  {sortedSplits.map((split) => (
                    <div
                      key={split.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-orange-400 font-bold">₹{split.amount.toFixed(2)}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-white">{split.friendName} owes you</span>
                          <Badge
                            variant={split.isPaid ? 'default' : 'secondary'}
                            className={split.isPaid ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-orange-500/20 text-orange-300 border-orange-500/30'}
                          >
                            {split.isPaid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                        {split.description && (
                          <p className="text-sm text-gray-300">{split.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(split.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!split.isPaid && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMarkPaid(split.id)}
                            className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(split)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(split.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No split expenses yet. Add one to track shared costs!</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="backdrop-blur-xl bg-orange-500/10 border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-white text-sm">Outstanding Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-400 mb-1">
                ₹{unpaidTotal.toFixed(2)}
              </div>
              <p className="text-xs text-gray-400">Total amount people owe you</p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-gray-400 space-y-2">
              <p>• Select multiple friends for group bills.</p>
              <p>• "Myself" share is automatically added to your expenses.</p>
              <p>• Click the checkmark when someone pays you back.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
