import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ProgressBar } from '@/components/spec/ProgressBar';
import { StatusBadge, TagsList } from '@/components/spec/StatusBadge';
import { formatRelativeTime } from '@/lib/utils';

type SpecWithRelations = {
    id: string;
    name: string;
    slug: string;
    progress: number | null;
    status: 'planned' | 'in-progress' | 'completed' | null;
    maturity: string | null;
    tags: string[] | null;
    updated_at: string;
    project: { id: string; name: string; slug: string; organization: { id: string; name: string; slug: string } };
    owner: { full_name: string | null; avatar_url: string | null } | null;
    comment_threads: { id: string; resolved: boolean }[];
    revisions: { id: string }[];
};

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get user's org memberships
    const { data: memberships } = await supabase
        .from('org_memberships')
        .select(
            `
      id,
      role,
      organization:organizations(id, name)
    `
        )
        .eq('user_id', user.id);

    // Get specs from all user's orgs
    const { data: specs } = (await supabase
        .from('specs')
        .select(
            `
      id,
      name,
      slug,
      progress,
      status,
      maturity,
      tags,
      updated_at,
      owner:profiles!specs_owner_id_fkey(full_name, avatar_url),
      project:projects(
        id,
        name,
        slug,
        organization:organizations(id, name, slug)
      ),
      comment_threads(id, resolved),
      revisions(id)
    `
        )
        .is('archived_at', null)
        .order('updated_at', { ascending: false })
        .limit(50)) as { data: SpecWithRelations[] | null };

    const hasOrgs = memberships && memberships.length > 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            Dashboard
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Your specifications at a glance
                        </p>
                    </div>
                    {hasOrgs && (
                        <Link
                            href="/new-org"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                        >
                            New Spec
                        </Link>
                    )}
                </div>

                {!hasOrgs ? (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <span className="text-3xl">🏢</span>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                            No organizations yet
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                            Create an organization to start managing your specifications.
                            Organizations help you group projects and collaborate with your team.
                        </p>
                        <Link
                            href="/new-org"
                            className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Create Organization
                        </Link>
                    </div>
                ) : !specs || specs.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <span className="text-3xl">📄</span>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                            No specifications yet
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                            Create your first specification to get started.
                        </p>
                        <Link
                            href="/new-org"
                            className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Create Specification
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {specs.map((spec) => {
                            const unresolvedCount =
                                spec.comment_threads?.filter((t) => !t.resolved).length || 0;
                            const revisionCount = spec.revisions?.length || 0;

                            return (
                                <Link
                                    key={spec.id}
                                    href={`/${spec.project.organization.slug}/${spec.project.slug}/${spec.slug}`}
                                    className="flex flex-col h-full p-6 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 transition-all duration-200 group shadow-sm"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {spec.name}
                                            </h3>
                                            <StatusBadge status={spec.status} />
                                        </div>

                                        <TagsList tags={spec.tags} />
                                    </div>

                                    {spec.progress !== null && (
                                        <div className="mt-4">
                                            <ProgressBar progress={spec.progress} size="sm" />
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                            <span>@{spec.owner?.full_name || 'Unknown'}</span>
                                            <span>·</span>
                                            <span>{formatRelativeTime(spec.updated_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
                                            {unresolvedCount > 0 && (
                                                <span className="text-orange-500 dark:text-orange-400">
                                                    💬 {unresolvedCount}
                                                </span>
                                            )}
                                            <span>{revisionCount} rev</span>
                                        </div>
                                    </div>

                                    <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                                        {spec.project.organization.name} / {spec.project.name}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
