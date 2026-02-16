
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';


export default async function OrgsIndexPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get all organizations the user is a member of
    const { data: memberships } = await supabase
        .from('org_memberships')
        .select(`
            role,
            created_at,
            organization:organizations (
                id,
                name,
                slug,
                created_at
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Your Organizations
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Manage your organizations and team access
                        </p>
                    </div>
                    <Link
                        href="/new-org"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Organization
                    </Link>
                </div>

                {memberships && memberships.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {memberships.map((membership: any) => (
                            <Link
                                key={membership.organization.id}
                                href={`/${membership.organization.slug}`}
                                className="block group"
                            >
                                <div className="h-full p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                                            {membership.organization.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                                            {membership.role}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                                        {membership.organization.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                        /{membership.organization.slug}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <div className="h-12 w-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                            No organizations found
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                            You haven't joined any organizations yet. Create one to get started with your projects.
                        </p>
                        <Link
                            href="/new-org"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Create Organization
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
