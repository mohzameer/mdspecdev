import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function OrgsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: memberships } = await supabase
        .from('org_memberships')
        .select(
            `
      id,
      role,
      organization:organizations(id, name, created_at)
    `
        )
        .eq('user_id', user.id);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            Organizations
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Manage your organizations and teams
                        </p>
                    </div>
                    <Link
                        href="/orgs/new"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                    >
                        New Organization
                    </Link>
                </div>

                {!memberships || memberships.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <span className="text-3xl">🏢</span>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                            No organizations yet
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                            Create your first organization to start managing specifications.
                        </p>
                        <Link
                            href="/orgs/new"
                            className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Create Organization
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {memberships.map((membership: any) => (
                            <Link
                                key={membership.id}
                                href={`/orgs/${membership.organization.id}`}
                                className="block p-6 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition-all duration-200 group shadow-sm"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <span className="text-white font-bold">
                                            {membership.organization.name[0].toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {membership.organization.name}
                                        </h3>
                                        <span className="text-xs text-slate-500 capitalize">
                                            {membership.role}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
