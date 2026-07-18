import { useState, useMemo, useEffect } from 'react';
import type { Split, Friend } from '../appTypes';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Plus, Pencil, Trash2, Check, Users, User, Split as SplitIcon, ChevronDown, ChevronUp, ReceiptText } from 'lucide-react';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface SplitManagerProps {
  splits: Split[];
  onAddBulk: (bulkData: any) => void;
  onUpdate: (id: number, split: Partial<Split>) => void;
  onDelete: (id: number) => void;
  onMarkPaid: (id: number) => void;
  onMarkPaidBulk: (ids: number[]) => void;
  friends: Friend[];
}

export function SplitManager({ splits, onAddBulk, onUpdate, onDelete, onMarkPaid, onMarkPaidBulk, friends }: SplitManagerProps) {
  const [open, setOpen] = useState(false);
  const [editingSplit, setEditingSplit] = useState<Split | null>(null);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  
  const [splitMode, setSplitMode] = useState<'equal' | 'manual'>('equal');
  const [manualShares, setManualShares] = useState<Record<string, string>>({});

  const [filterFriendId, setFilterFriendId] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [visibleSplitsCount, setVisibleSplitsCount] = useState(10);

  useEffect(() => {
    setVisibleSplitsCount(10);
  }, [filterFriendId, filterDateFrom, filterDateTo]);

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
    const selectedPeople = [
      ...formData.selectedFriendIds.map(id => id.toString()),
      ...(formData.customFriendName ? ['custom'] : []),
      ...(formData.includeMyself ? ['myself'] : []),
    ];
    
    const peopleCount = selectedPeople.length;

    if (peopleCount === 0 || totalAmount === 0) return null;

    if (splitMode === 'equal') {
      const baseShare = Math.floor((totalAmount / peopleCount) * 100) / 100;
      const remainder = Math.round((totalAmount - baseShare * peopleCount) * 100);
      
      const shares: Record<string, number> = {};
      selectedPeople.forEach((person, index) => {
        shares[person] = baseShare + (index < remainder ? 0.01 : 0);
      });

      return {
        mode: 'equal',
        shares,
        peopleCount,
        totalAssigned: totalAmount,
        isValid: true
      };
    } else {
      let totalAssigned = 0;
      let blankCount = 0;
      const shares: Record<string, number> = {};
      
      selectedPeople.forEach(person => {
        const val = manualShares[person];
        if (val === undefined || val === '') {
          blankCount++;
        } else {
          const amt = parseFloat(val) || 0;
          shares[person] = amt;
          totalAssigned += amt;
        }
      });

      if (blankCount > 0) {
        const remaining = Math.max(0, totalAmount - totalAssigned);
        const baseShare = Math.floor((remaining / blankCount) * 100) / 100;
        const remainder = Math.round((remaining - baseShare * blankCount) * 100);
        
        let blankIndex = 0;
        selectedPeople.forEach(person => {
          const val = manualShares[person];
          if (val === undefined || val === '') {
            shares[person] = baseShare + (blankIndex < remainder ? 0.01 : 0);
            totalAssigned += shares[person];
            blankIndex++;
          }
        });
      }
      
      const isValid = Math.abs(totalAmount - totalAssigned) < 0.01;
      return {
        mode: 'manual',
        shares,
        peopleCount,
        totalAssigned,
        isValid
      };
    }
  }, [formData.amount, formData.selectedFriendIds, formData.includeMyself, formData.customFriendName, splitMode, manualShares]);

  const filteredSplits = useMemo(() => {
    return splits.filter((split) => {
      // Filter by friend
      if (filterFriendId) {
        const fid = parseInt(filterFriendId, 10);
        const splitFriendId = split.friendId ?? (split as any).friend_id;
        const targetFriend = friends.find(f => f.id === fid);
        
        if (splitFriendId !== undefined && splitFriendId !== null) {
          if (splitFriendId !== fid) return false;
        } else if (targetFriend && split.friendName) {
          if (split.friendName.toLowerCase() !== targetFriend.name.toLowerCase()) return false;
        } else {
          return false;
        }
      }

      // Filter by from date
      if (filterDateFrom) {
        const splitDate = new Date(split.date);
        const fromDate = new Date(filterDateFrom);
        splitDate.setHours(0, 0, 0, 0);
        fromDate.setHours(0, 0, 0, 0);
        if (splitDate < fromDate) return false;
      }

      // Filter by to date
      if (filterDateTo) {
        const splitDate = new Date(split.date);
        const toDate = new Date(filterDateTo);
        splitDate.setHours(0, 0, 0, 0);
        toDate.setHours(0, 0, 0, 0);
        if (splitDate > toDate) return false;
      }

      return true;
    });
  }, [splits, filterFriendId, filterDateFrom, filterDateTo, friends]);

  const unpaidFilteredSplits = useMemo(() => {
    return filteredSplits.filter(s => !s.isPaid);
  }, [filteredSplits]);

  const handleMarkAllPaid = () => {
    const ids = unpaidFilteredSplits.map(s => s.id);
    if (ids.length === 0) return;
    if (window.confirm(`Are you sure you want to mark all ${ids.length} filtered splits as paid?`)) {
      onMarkPaidBulk(ids);
    }
  };

  const groupedBills = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      title: string;
      date: string;
      totalAmount: number;
      outstandingAmount: number;
      paidAmount: number;
      items: Split[];
    }>();

    filteredSplits.forEach((split) => {
      const title = split.description?.trim() || 'Unlabelled Split';
      const key = `${title.toLowerCase()}|${split.date}`;
      const existing = groups.get(key) || {
        key,
        title,
        date: split.date,
        totalAmount: 0,
        outstandingAmount: 0,
        paidAmount: 0,
        items: [],
      };

      existing.totalAmount += split.amount;
      if (split.isPaid) {
        existing.paidAmount += split.amount;
      } else {
        existing.outstandingAmount += split.amount;
      }
      existing.items.push(split);
      groups.set(key, existing);
    });

    return [...groups.values()]
      .filter(group => group.outstandingAmount > 0)
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.totalAmount - a.totalAmount;
      });
  }, [filteredSplits]);

  const totalOutstanding = useMemo(
    () => groupedBills.reduce((sum, bill) => sum + bill.outstandingAmount, 0),
    [groupedBills],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);

    if (editingSplit) {
      onUpdate(editingSplit.id, {
        amount,
        description: formData.description,
        date: formData.date,
      });
    } else {
      const shares = splitPreview?.shares || {};
      const bulkSplits = [];

      formData.selectedFriendIds.forEach(id => {
        const friend = friends.find(f => f.id === id);
        bulkSplits.push({
          friend_id: id,
          friend_name: friend?.name,
          amount: shares[id.toString()] || 0,
        });
      });

      if (formData.customFriendName) {
        bulkSplits.push({
          friend_name: formData.customFriendName,
          amount: shares['custom'] || 0,
        });
      }

      onAddBulk({
        totalAmount: amount,
        description: formData.description,
        date: formData.date,
        userShare: formData.includeMyself ? (shares['myself'] || 0) : 0,
        splits: bulkSplits.filter(s => s.amount > 0),
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
    setSplitMode('equal');
    setManualShares({});
    setEditingSplit(null);
    setOpen(false);
  };

  const handleEdit = (split: Split) => {
    setEditingSplit(split);
    setFormData({
      amount: split.amount.toString(),
      description: split.description,
      date: split.date,
      selectedFriendIds: [],
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

  const handleManualShareChange = (personKey: string, value: string) => {
    setManualShares(prev => ({ ...prev, [personKey]: value }));
  };

  const sortedSplits = useMemo(() => {
    return [...filteredSplits].sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [filteredSplits]);

  const hasActiveFilter = !!(filterFriendId || filterDateFrom || filterDateTo);

  const slicedSplits = useMemo(() => {
    if (hasActiveFilter) {
      return sortedSplits;
    }
    return sortedSplits.slice(0, visibleSplitsCount);
  }, [sortedSplits, visibleSplitsCount, hasActiveFilter]);

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
              <DialogTitle className="text-white flex items-center gap-2">
                <SplitIcon className="w-5 h-5 text-orange-400" />
                {editingSplit ? 'Edit Split' : 'New Split Trip/Bill'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                
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
                      className="bg-white/10 border-white/20 text-white text-lg font-bold placeholder:font-normal"
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

                {!editingSplit && (
                  <div className="bg-slate-800/50 p-1 rounded-lg flex mt-2 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setSplitMode('equal')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${splitMode === 'equal' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Split Equally
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMode('manual')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${splitMode === 'manual' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Split Manually
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-gray-300">Who is splitting this?</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    
                    {/* Myself */}
                    <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${formData.includeMyself ? 'bg-orange-500/20 border-orange-500/50' : 'bg-white/5 border-white/10'} border`}>
                      <div 
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                        onClick={() => setFormData(p => ({ ...p, includeMyself: !p.includeMyself }))}
                      >
                        <User className="w-4 h-4 text-orange-400" />
                        <span>Myself</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {splitMode === 'manual' && formData.includeMyself ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="w-24 h-7 text-right bg-white/10 border-white/20 text-white"
                            placeholder={splitPreview?.shares['myself'] !== undefined && manualShares['myself'] === undefined ? splitPreview.shares['myself'].toFixed(2) : "0.00"}
                            value={manualShares['myself'] || ''}
                            onChange={(e) => handleManualShareChange('myself', e.target.value)}
                          />
                        ) : (
                          formData.includeMyself && splitMode === 'equal' && splitPreview?.shares['myself'] !== undefined && (
                            <span className="text-sm font-medium text-orange-300">₹{splitPreview.shares['myself'].toFixed(2)}</span>
                          )
                        )}
                        {formData.includeMyself && splitMode === 'equal' && <Check className="w-4 h-4 text-orange-400" />}
                      </div>
                    </div>

                    {/* Friends */}
                    {friends.map(friend => (
                      <div key={friend.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${formData.selectedFriendIds.includes(friend.id) ? 'bg-blue-500/20 border-blue-500/50' : 'bg-white/5 border-white/10'} border`}>
                        <div 
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => toggleFriend(friend.id)}
                        >
                          <Users className="w-4 h-4 text-blue-400" />
                          <span>{friend.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {splitMode === 'manual' && formData.selectedFriendIds.includes(friend.id) ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24 h-7 text-right bg-white/10 border-white/20 text-white"
                              placeholder={splitPreview?.shares[friend.id.toString()] !== undefined && manualShares[friend.id.toString()] === undefined ? splitPreview.shares[friend.id.toString()].toFixed(2) : "0.00"}
                              value={manualShares[friend.id.toString()] || ''}
                              onChange={(e) => handleManualShareChange(friend.id.toString(), e.target.value)}
                            />
                          ) : (
                            formData.selectedFriendIds.includes(friend.id) && splitMode === 'equal' && splitPreview?.shares[friend.id.toString()] !== undefined && (
                              <span className="text-sm font-medium text-blue-300">₹{splitPreview.shares[friend.id.toString()].toFixed(2)}</span>
                            )
                          )}
                          {formData.selectedFriendIds.includes(friend.id) && splitMode === 'equal' && <Check className="w-4 h-4 text-blue-400" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!editingSplit && (
                    <div className="pt-2">
                      <Label htmlFor="customName" className="text-xs text-gray-400">Or add a one-time name</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="customName"
                          value={formData.customFriendName}
                          onChange={(e) => setFormData({ ...formData, customFriendName: e.target.value })}
                          className="bg-white/10 border-white/20 text-white flex-1"
                          placeholder="Enter name..."
                        />
                        {splitMode === 'manual' && formData.customFriendName && (
                          <Input
                            type="number"
                            step="0.01"
                            className="w-24 bg-white/10 border-white/20 text-white text-right"
                            placeholder={splitPreview?.shares['custom'] !== undefined && manualShares['custom'] === undefined ? splitPreview.shares['custom'].toFixed(2) : "0.00"}
                            value={manualShares['custom'] || ''}
                            onChange={(e) => handleManualShareChange('custom', e.target.value)}
                          />
                        )}
                        {splitMode === 'equal' && formData.customFriendName && splitPreview?.shares['custom'] !== undefined && (
                          <div className="flex items-center px-3 bg-white/5 border border-white/10 rounded-md text-sm text-gray-300">
                            ₹{splitPreview.shares['custom'].toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                  <Card className={`border ${splitPreview.isValid ? 'bg-orange-500/10 border-orange-500/20' : 'bg-red-500/10 border-red-500/30'}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center text-sm">
                        {splitMode === 'equal' ? (
                          <>
                            <span className="text-gray-300">Split between {splitPreview.peopleCount} people:</span>
                            <span className="text-orange-400 font-bold">Total ₹{splitPreview.totalAssigned.toFixed(2)}</span>
                          </>
                        ) : (
                          <>
                            <span className={splitPreview.isValid ? 'text-gray-300' : 'text-red-400'}>
                              {splitPreview.isValid ? 'Manual split balanced:' : `Balance remaining: ₹${(parseFloat(formData.amount || '0') - splitPreview.totalAssigned).toFixed(2)}`}
                            </span>
                            <span className={`${splitPreview.isValid ? 'text-orange-400' : 'text-red-400'} font-bold`}>
                              Assigned ₹{splitPreview.totalAssigned.toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!splitPreview?.isValid}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50"
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

      {/* Filters Card */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="filterFriend" className="text-gray-300 text-sm flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-orange-400" />
                Filter by Friend
              </Label>
              <select
                id="filterFriend"
                value={filterFriendId}
                onChange={(e) => setFilterFriendId(e.target.value)}
                className="w-full h-10 rounded-md bg-white/10 border border-white/20 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-white">All Friends</option>
                {friends.map((f) => (
                  <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-44 space-y-2">
              <Label htmlFor="filterFrom" className="text-gray-300 text-sm">
                From Date
              </Label>
              <Input
                id="filterFrom"
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="bg-white/10 border-white/20 text-white w-full h-10 px-3 cursor-pointer"
              />
            </div>

            <div className="w-full md:w-44 space-y-2">
              <Label htmlFor="filterTo" className="text-gray-300 text-sm">
                To Date
              </Label>
              <Input
                id="filterTo"
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="bg-white/10 border-white/20 text-white w-full h-10 px-3 cursor-pointer"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
              {unpaidFilteredSplits.length > 0 && (
                <Button
                  type="button"
                  onClick={handleMarkAllPaid}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-10 px-4 flex-1 md:flex-none flex items-center justify-center gap-1.5 font-medium"
                >
                  <Check className="w-4 h-4" />
                  Paid All ({unpaidFilteredSplits.length})
                </Button>
              )}

              {(filterFriendId || filterDateFrom || filterDateTo) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFilterFriendId('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 px-4 flex-1 md:flex-none"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <div>
              Showing {filteredSplits.length} of {splits.length} splits
              {unpaidFilteredSplits.length > 0 && ` (${unpaidFilteredSplits.length} pending)`}
            </div>
            <div>
              Filtered Total: <span className="text-orange-400 font-semibold">₹{filteredSplits.reduce((sum, s) => sum + s.amount, 0).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {!hasActiveFilter && (
            <Card className="backdrop-blur-xl bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-orange-400" />
                  Bill Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedBills.length > 0 ? (
                  groupedBills.map((bill) => {
                    const isExpanded = expandedGroupKey === bill.key;
                    const isRent = bill.title.toLowerCase().includes('rent');
                    return (
                      <div key={bill.key} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedGroupKey((current) => current === bill.key ? null : bill.key)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-white/5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-white font-semibold">{bill.title}</p>
                              {isRent && (
                                <Badge className="border-orange-500/30 bg-orange-500/15 text-orange-300">
                                  Rent
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">
                              {new Date(bill.date).toLocaleDateString()} • {bill.items.length} people
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <p className="text-sm text-orange-300 font-semibold">
                              ₹{bill.totalAmount.toFixed(2)} total
                            </p>
                            <p className="text-xs text-gray-400">
                              ₹{bill.outstandingAmount.toFixed(2)} to collect
                            </p>
                          </div>

                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-white/10 px-4 py-4 space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="rounded-lg bg-white/5 p-3">
                                <p className="text-gray-400">Total</p>
                                <p className="text-white font-semibold">₹{bill.totalAmount.toFixed(2)}</p>
                              </div>
                              <div className="rounded-lg bg-orange-500/10 p-3">
                                <p className="text-gray-400">Pending</p>
                                <p className="text-orange-300 font-semibold">₹{bill.outstandingAmount.toFixed(2)}</p>
                              </div>
                              <div className="rounded-lg bg-green-500/10 p-3">
                                <p className="text-gray-400">Paid</p>
                                <p className="text-green-300 font-semibold">₹{bill.paidAmount.toFixed(2)}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {bill.items.map((split) => (
                                <div
                                  key={split.id}
                                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm text-white">{split.friendName}</p>
                                    <p className="text-xs text-gray-400">
                                      {split.isPaid ? 'Paid' : 'To collect'} • {new Date(split.date).toLocaleDateString()}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={split.isPaid ? 'text-green-300 font-semibold' : 'text-orange-300 font-semibold'}>
                                      ₹{split.amount.toFixed(2)}
                                    </span>
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
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-400 text-center py-8">
                    {filterFriendId || filterDateFrom || filterDateTo
                      ? 'No bill groups match the selected filters.'
                      : 'No bill groups yet. Add a split to see rent and other bills here.'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Recent Splits</CardTitle>
            </CardHeader>
            <CardContent>
              {slicedSplits.length > 0 ? (
                <>
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-3"
                  >
                    {slicedSplits.map((split) => (
                      <motion.div
                        variants={itemVariants}
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
                      </motion.div>
                    ))}
                  </motion.div>
                  {sortedSplits.length > visibleSplitsCount && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="ghost"
                        onClick={() => setVisibleSplitsCount(prev => prev + 10)}
                        className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 text-xs font-semibold px-4 py-2"
                      >
                        Show More
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-400 text-center py-8">
                  {filterFriendId || filterDateFrom || filterDateTo
                    ? 'No splits match the selected filters.'
                    : 'No split expenses yet. Add one to track shared costs!'}
                </p>
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
                <CountUp end={totalOutstanding} prefix="₹" decimals={2} duration={2} preserveValue={true} />
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
