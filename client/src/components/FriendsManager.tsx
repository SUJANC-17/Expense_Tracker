import { useState } from 'react';
import type { Friend } from '../appTypes';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Trash2, UserPlus } from 'lucide-react';

interface FriendsManagerProps {
    friends: Friend[];
    onAdd: (friend: Omit<Friend, 'id'>) => void;
    onDelete: (id: number) => void;
}

export function FriendsManager({ friends, onAdd, onDelete }: FriendsManagerProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({ name });
        setName('');
        setOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-white mb-2">Friend Profiles</h2>
                    <p className="text-gray-400">Manage people you frequently split expenses with</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Friend
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="backdrop-blur-xl bg-slate-900/95 border-white/20 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-white">Add New Friend</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-gray-300">Friend Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="bg-white/10 border-white/20 text-white"
                                    placeholder="Enter name..."
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                                >
                                    Add Friend
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-white/20 text-white hover:bg-white/10">
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                <CardHeader>
                    <CardTitle className="text-white">Your Friends</CardTitle>
                </CardHeader>
                <CardContent>
                    {friends.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {friends.map((friend) => (
                                <div
                                    key={friend.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                                            {friend.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-white font-medium">{friend.name}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDelete(friend.id)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-8">No friends added yet. Add someone to get started!</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
