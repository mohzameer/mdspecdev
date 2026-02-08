'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface UserInfo {
    email: string;
    fullName: string | null;
}

export function Header() {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        async function getUser() {
            try {
                const {
                    data: { user: authUser },
                } = await supabase.auth.getUser();

                if (authUser) {
                    // Try to get profile, but fall back to auth user data
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, email')
                        .eq('id', authUser.id)
                        .single();

                    setUser({
                        email: profile?.email || authUser.email || '',
                        fullName: profile?.full_name || authUser.user_metadata?.full_name || null,
                    });
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                setUser(null);
            }
            setLoading(false);
        }

        getUser();

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setUser({
                    email: session.user.email || '',
                    fullName: session.user.user_metadata?.full_name || null,
                });
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    async function handleSignOut() {
        await supabase.auth.signOut();
        setUser(null);
        router.push('/login');
        router.refresh();
    }

    const isAuthPage =
        pathname?.startsWith('/login') || pathname?.startsWith('/signup');
    if (isAuthPage) return null;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-8">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">M</span>
                        </div>
                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                            mdspec
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-6">
                        <Link
                            href="/dashboard"
                            className={`text-sm font-medium transition-colors hover:text-slate-900 dark:hover:text-white ${pathname === '/dashboard'
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/orgs"
                            className={`text-sm font-medium transition-colors hover:text-slate-900 dark:hover:text-white ${pathname?.startsWith('/orgs')
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            Organizations
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />

                    {user && <NotificationBell />}

                    {loading ? (
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    ) : user ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-600 dark:text-slate-300 hidden sm:block">
                                {user.fullName || user.email}
                            </span>
                            <button
                                onClick={handleSignOut}
                                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
