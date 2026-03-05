import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatRelativeTime, formatDate } from '@/lib/utils';

interface Props {
    params: Promise<{ orgSlug: string; projectSlug: string; specSlug: string }>;
}

export default async function RevisionsPage({ params }: Props) {
    const { orgSlug, projectSlug, specSlug } = await params;
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
        const { data: orgById } = await supabase
            .from('organizations')
            .select('id, name, slug')
            .eq('id', orgSlug)
            .single();

        if (orgById) {
            redirect(`/${orgById.slug}/${projectSlug}/${specSlug}/revisions`);
        } else {
            redirect('/dashboard');
        }
    }

    // Resolve project by slug
    let project = null;
    const { data: projectBySlug } = await supabase
        .from('projects')
        .select('id, name, slug')
        .eq('slug', projectSlug)
        .eq('org_id', org.id)
        .single();

    if (projectBySlug) {
        project = projectBySlug;
    } else {
        const { data: projectById } = await supabase
            .from('projects')
            .select('id, name, slug')
            .eq('id', projectSlug)
            .eq('org_id', org.id)
            .single();

        if (projectById) {
            redirect(`/${org.slug}/${projectById.slug}/${specSlug}/revisions`);
        } else {
            redirect(`/${org.slug}`);
        }
    }

    const { data: spec } = await supabase
        .from('specs')
        .select(
            `
      id,
      name,
      slug,
      revisions(
        id,
        revision_number,
        created_at,
        summary,
        author:profiles(full_name, email)
      )
    `
        )
        .eq('project_id', project.id)
        .eq('slug', specSlug)
        .single();

    if (!spec) {
        redirect(`/${org.slug}/${project.slug}`);
    }

    const revisions = (spec.revisions as any[])?.sort(
        (a, b) => b.revision_number - a.revision_number
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-4">
                    <Link
                        href={`/${org.slug}/${project.slug}/${specSlug}`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm"
                    >
                        ← Back to {spec.name}
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            Revision History
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {revisions?.length || 0} revisions for {spec.name}
                        </p>
                    </div>
                </div>

                {!revisions || revisions.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-slate-500 dark:text-slate-400">
                            No revisions found.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {revisions.map((revision: any, index: number) => (
                            <div
                                key={revision.id}
                                className="p-6 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium rounded">
                                                v{revision.revision_number}
                                            </span>
                                            {index === 0 && (
                                                <span className="px-2 py-1 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium rounded">
                                                    Latest
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-900 dark:text-white mt-2">
                                            {revision.summary || 'No summary provided'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 dark:text-slate-400">
                                            <span>
                                                by @{revision.author?.full_name || 'Unknown'}
                                            </span>
                                            <span>·</span>
                                            <span>{formatDate(revision.created_at)}</span>
                                            <span>({formatRelativeTime(revision.created_at)})</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/${org.slug}/${project.slug}/${specSlug}/revisions/${revision.revision_number}`}
                                            className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white rounded-lg transition-colors"
                                        >
                                            View
                                        </Link>
                                        {revision.revision_number > 1 && (
                                            <Link
                                                href={`/${org.slug}/${project.slug}/${specSlug}/revisions/${revision.revision_number}/diff`}
                                                className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white rounded-lg transition-colors"
                                            >
                                                Diff
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
