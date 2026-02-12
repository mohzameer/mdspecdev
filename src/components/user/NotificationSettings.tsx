
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function NotificationSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [preferences, setPreferences] = useState({
        email_mentions: true,
        email_comments: true,
    });
    const supabase = createClient();

    useEffect(() => {
        const fetchPreferences = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('notification_preferences')
                .eq('id', user.id)
                .single();

            if (data?.notification_preferences) {
                setPreferences(data.notification_preferences as any);
            }
            setLoading(false);
        };

        fetchPreferences();
    }, []);

    const handleToggle = async (key: 'email_mentions' | 'email_comments') => {
        const newPreferences = {
            ...preferences,
            [key]: !preferences[key],
        };
        setPreferences(newPreferences);
        setSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('profiles')
                    .update({ notification_preferences: newPreferences })
                    .eq('id', user.id);
            }
        } catch (error) {
            console.error('Failed to update preferences:', error);
            // Revert on error
            setPreferences(preferences);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-sm text-slate-500">Loading preferences...</div>;
    }

    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Email Notifications
            </h3>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white">Mentions</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Receive emails when someone mentions you like @username
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle('email_mentions')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.email_mentions ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.email_mentions ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white">New Comments</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            Receive emails on threads you are participating in
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle('email_comments')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${preferences.email_comments ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.email_comments ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>

            {saving && (
                <div className="mt-4 text-xs text-blue-500 flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                </div>
            )}
        </div>
    );
}
