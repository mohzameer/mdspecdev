'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, Suspense } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { UserNav } from '@/components/shared/UserNav';
import { SearchInput } from '@/components/shared/SearchInput';
import { useStickyHeader } from '@/components/providers/StickyHeaderProvider';

import { Logo } from '@/components/shared/Logo';

interface UserInfo {
    email: string;
    fullName: string | null;
    avatarUrl?: string | null;
}

export function Header() {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const supabase = createClient();
    const { title: stickyTitle, isVisible: isStickyTitleVisible } = useStickyHeader();

    const [currentOrgSlug, setCurrentOrgSlug] = useState<string | null>(null);
    const [orgName, setOrgName] = useState<string | null>(null);

    // Extract org slug from pathname and fetch details
    useEffect(() => {
        const segments = pathname?.split('/').filter(Boolean) || [];
        // Pattern: /[orgSlug] or /[orgSlug]/...
        // Ignore reserved paths like: dashboard, login, settings, orgs, etc.
        const reservedPaths = ['dashboard', 'login', 'signup', 'settings', 'orgs', 'new-org', 'guide', 'api'];

        if (segments.length > 0 && !reservedPaths.includes(segments[0])) {
            const slug = segments[0];
            if (slug !== currentOrgSlug) {
                setCurrentOrgSlug(slug);
                // Fetch org name
                const fetchOrgName = async () => {
                    if (!supabase) return;
                    const { data } = await supabase
                        .from('organizations')
                        .select('name')
                        .eq('slug', slug)
                        .single();

                    if (data) {
                        setOrgName(data.name);
                    } else {
                        setOrgName(null);
                    }
                };
                fetchOrgName();
            }
        } else {
            // We are on a dashboard or other page, try to fetch the first organization for the user
            const fetchDefaultOrg = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: membership } = await supabase
                    .from('org_memberships')
                    .select('organization:organizations(name, slug)')
                    .eq('user_id', user.id)
                    .limit(1)
                    .single();

                if (membership?.organization) {
                    const org = membership.organization as any;
                    setCurrentOrgSlug(org.slug);
                    setOrgName(org.name);
                } else {
                    setCurrentOrgSlug(null);
                    setOrgName(null);
                }
            };
            fetchDefaultOrg();
        }
    }, [pathname, supabase]);

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
                        .select('full_name, email, avatar_url')
                        .eq('id', authUser.id)
                        .single();

                    setUser({
                        email: profile?.email || authUser.email || '',
                        fullName: profile?.full_name || authUser.user_metadata?.full_name || null,
                        avatarUrl: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
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
                    avatarUrl: session.user.user_metadata?.avatar_url || null,
                });
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const isAuthPage =
        pathname?.startsWith('/login') || pathname?.startsWith('/signup');
    if (isAuthPage) return null;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 relative">
                <div className="flex items-center gap-8 z-10">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Logo className="h-8 w-8" />
                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                            mdspec
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-6">
                        {user ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className={`text-sm font-medium transition-colors hover:text-slate-900 dark:hover:text-white ${pathname === '/dashboard'
                                        ? 'text-slate-900 dark:text-white'
                                        : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                >
                                    Dashboard
                                </Link>
                                {orgName && (
                                    <Link
                                        href={`/${currentOrgSlug}`}
                                        className={`text-sm font-medium transition-colors hover:text-slate-900 dark:hover:text-white ${pathname?.startsWith(`/${currentOrgSlug}`)
                                            ? 'text-slate-900 dark:text-white'
                                            : 'text-slate-500 dark:text-slate-400'
                                            }`}
                                    >
                                        {orgName}
                                    </Link>
                                )}
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/blog"
                                    className={`text-sm font-medium transition-colors hover:text-slate-900 dark:hover:text-white ${pathname?.startsWith('/blog')
                                        ? 'text-slate-900 dark:text-white'
                                        : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                >
                                    Blog
                                </Link>
                                <Link
                                    href="/guide"
                                    className={`text-sm font-medium transition-colors hover:text-slate-900 dark:hover:text-white ${pathname?.startsWith('/guide')
                                        ? 'text-slate-900 dark:text-white'
                                        : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                >
                                    Guide
                                </Link>
                                <Link
                                    href="/contact"
                                    className={`text-sm font-medium transition-colors hover:text-slate-900 dark:hover:text-white ${pathname === '/contact'
                                        ? 'text-slate-900 dark:text-white'
                                        : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                >
                                    Contact
                                </Link>
                            </>
                        )}
                    </nav>
                </div>

                {/* Centered Sticky Title */}
                <div
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[40%] flex justify-center transition-all duration-300 ease-in-out z-0 pointer-events-none ${isStickyTitleVisible ? 'opacity-100 translate-y-[-50%]' : 'opacity-0 translate-y-[0%]'
                        }`}
                >
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate px-4">
                        {stickyTitle}
                    </h2>
                </div>

                <div className="flex items-center gap-4 z-10">
                    {user && (
                        <div className="hidden md:block w-full max-w-sm mr-4">
                            <Suspense fallback={<div className="h-10 w-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />}>
                                <SearchInput />
                            </Suspense>
                        </div>
                    )}
                    <ThemeToggle />

                    {user && <NotificationBell />}

                    {loading ? (
                        <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    ) : user ? (
                        <UserNav user={user} />
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
