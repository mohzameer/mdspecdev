
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NotificationSettings } from '@/components/user/NotificationSettings';

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120]">
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16 gap-4">
                        <Link
                            href="/dashboard"
                            className="p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                            Account Settings
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">
                    {/* Profile Section (Placeholder for future) */}
                    <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xl font-bold text-slate-600 dark:text-slate-300">
                                {user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {user.user_metadata?.full_name || 'User'}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <NotificationSettings />
                </div>
            </main>
        </div>
    );
}
