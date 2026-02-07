import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ProgressBar } from '@/components/spec/ProgressBar';
import { StatusBadge, TagsList } from '@/components/spec/StatusBadge';
import { formatRelativeTime } from '@/lib/utils';

interface Props {
    params: Promise<{ orgId: string; projectId: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
    const { orgId: orgSlug, projectId } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Resolve org by slug
    let org = null;
    const { data: orgBySlug } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', orgSlug)
        .single();

    if (orgBySlug) {
        org = orgBySlug;
    } else {
        // Fallback to ID lookup
        const { data: orgById } = await supabase
            .from('organizations')
            .select('id, name, slug')
            .eq('id', orgSlug)
            .single();

        if (orgById) {
            redirect(`/orgs/${orgById.slug}/projects/${projectId}`);
        } else {
            redirect('/orgs');
        }
    }

    // Resolve project by slug
    let project = null;
    const { data: projectBySlug } = await supabase
        .from('projects')
        .select('id, name, slug, description')
        .eq('slug', projectId)
        .eq('org_id', org.id)
        .single();

    if (projectBySlug) {
        project = projectBySlug;
    } else {
        // Fallback to ID lookup
        const { data: projectById } = await supabase
            .from('projects')
            .select('id, name, slug, description')
            .eq('id', projectId)
            .eq('org_id', org.id)
            .single();

        if (projectById) {
            redirect(`/orgs/${org.slug}/projects/${projectById.slug}`);
        } else {
            redirect(`/orgs/${org.slug}`);
        }
    }

    const { data: specs } = await supabase
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
      comment_threads(id, resolved),
      revisions(id)
    `
        )
        .eq('project_id', project.id)
        .is('archived_at', null)
        .order('updated_at', { ascending: false });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-4">
                    <Link
                        href={`/orgs/${org.slug}`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm"
                    >
                        ← Back to {org.name}
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {project.name}
                        </h1>
                        {project.description && (
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                {project.description}
                            </p>
                        )}
                    </div>
                    <Link
                        href={`/orgs/${org.slug}/projects/${project.slug}/specs/new`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                    >
                        New Spec
                    </Link>
                </div>

                {!specs || specs.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <span className="text-2xl">📄</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            No specifications yet
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            Create your first specification in this project.
                        </p>
                        <Link
                            href={`/orgs/${org.slug}/projects/${project.slug}/specs/new`}
                            className="inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Create Specification
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {specs.map((spec: any) => {
                            const unresolvedCount =
                                spec.comment_threads?.filter((t: any) => !t.resolved).length ||
                                0;
                            const revisionCount = spec.revisions?.length || 0;

                            return (
                                <Link
                                    key={spec.id}
                                    href={`/orgs/${org.slug}/projects/${project.slug}/specs/${spec.slug}`}
                                    className="block p-6 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition-all duration-200 group shadow-sm"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {spec.name}
                                        </h3>
                                        <StatusBadge status={spec.status} />
                                    </div>

                                    <TagsList tags={spec.tags} />

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
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
