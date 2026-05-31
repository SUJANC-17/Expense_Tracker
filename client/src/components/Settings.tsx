import { useEffect, useState } from 'react';
import { BellRing, Clock3, Save, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../utils/api';
import type { ReminderSettings } from '../appTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

const DEFAULT_SETTINGS: ReminderSettings = {
    reminderEnabled: true,
    reminderTime: '21:00',
};

export function Settings() {
    const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;

        const loadSettings = async () => {
            setLoading(true);
            try {
                const data = await apiClient.get('/reminder-settings') as ReminderSettings;
                if (!active) return;
                setSettings({
                    reminderEnabled: Boolean(data?.reminderEnabled ?? true),
                    reminderTime: data?.reminderTime || DEFAULT_SETTINGS.reminderTime,
                });
            } catch (error) {
                console.error('Failed to load reminder settings:', error);
                toast.error('Could not load reminder settings');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadSettings();

        return () => {
            active = false;
        };
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await apiClient.put('/reminder-settings', settings) as ReminderSettings;
            setSettings({
                reminderEnabled: Boolean(updated?.reminderEnabled ?? settings.reminderEnabled),
                reminderTime: updated?.reminderTime || settings.reminderTime,
            });
            toast.success('Reminder settings saved');
        } catch (error) {
            console.error('Failed to save reminder settings:', error);
            toast.error('Failed to save reminder settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-white mb-2">Settings</h2>
                <p className="text-gray-400">Manage your daily email reminder preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="backdrop-blur-xl bg-white/10 border-white/20 lg:col-span-2">
                    <CardHeader className="border-b border-white/10">
                        <CardTitle className="text-white flex items-center gap-2">
                            <BellRing className="h-5 w-5 text-emerald-400" />
                            Daily Reminder
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            Send yourself a reminder if no expense has been logged by your chosen time.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                            <div>
                                <Label htmlFor="reminder-toggle" className="text-white text-base font-medium flex items-center gap-2">
                                    {settings.reminderEnabled ? (
                                        <ToggleRight className="h-4 w-4 text-emerald-400" />
                                    ) : (
                                        <ToggleLeft className="h-4 w-4 text-slate-400" />
                                    )}
                                    Enable daily reminder
                                </Label>
                                <p className="text-sm text-gray-400 mt-1">
                                    {settings.reminderEnabled
                                        ? 'Emails are active and will be sent at the selected time.'
                                        : 'Emails are paused until you turn reminders back on.'}
                                </p>
                            </div>
                            <Switch
                                id="reminder-toggle"
                                checked={settings.reminderEnabled}
                                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, reminderEnabled: checked }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reminder-time" className="text-white flex items-center gap-2">
                                <Clock3 className="h-4 w-4 text-sky-400" />
                                Reminder time
                            </Label>
                            <Input
                                id="reminder-time"
                                type="time"
                                value={settings.reminderTime}
                                onChange={(e) => setSettings((prev) => ({ ...prev, reminderTime: e.target.value }))}
                                className="bg-white/5 border-white/10 text-white h-11"
                            />
                            <p className="text-sm text-gray-400">
                                Default is 9:00 PM. The reminder service checks every minute and sends only when the chosen time matches.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? 'Saving...' : 'Save settings'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="backdrop-blur-xl bg-white/10 border-white/20">
                    <CardHeader className="border-b border-white/10">
                        <CardTitle className="text-white flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-cyan-400" />
                            Current status
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            Your active reminder preferences.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-gray-400 mb-1">Reminder</p>
                            <p className="text-lg text-white font-semibold">
                                {settings.reminderEnabled ? 'Enabled' : 'Disabled'}
                            </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-gray-400 mb-1">Send time</p>
                            <p className="text-lg text-white font-semibold">
                                {settings.reminderTime}
                            </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-emerald-500/10 p-4">
                            <p className="text-sm text-emerald-200 mb-1">What it does</p>
                            <p className="text-sm text-emerald-50/90 leading-relaxed">
                                Every minute, the server checks whether it is time to send your reminder and whether you have already logged an expense today.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
