import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/spec/MarkdownRenderer';
import { formatDate } from '@/lib/utils';

interface Props {
    params: Promise<{
        orgSlug: string;
        projectSlug: string;
        specSlug: string;
        revisionNumber: string;
    }>;
}

export default async function RevisionDetailPage({ params }: Props) {
    const {
        orgSlug,
        projectSlug,
        specSlug,
        revisionNumber,
    } = await params;
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
            redirect(
                `/${orgById.slug}/${projectSlug}/${specSlug}/revisions/${revisionNumber}`
            );
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
            redirect(
                `/${org.slug}/${projectById.slug}/${specSlug}/revisions/${revisionNumber}`
            );
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
        content_key,
        summary,
        author:profiles(full_name)
      )
    `
        )
        .eq('project_id', project.id)
        .eq('slug', specSlug)
        .single();

    if (!spec) {
        redirect(`/${org.slug}/${project.slug}`);
    }

    const revisionNum = parseInt(revisionNumber);
    const revision = (spec.revisions as any[])?.find(
        (r) => r.revision_number === revisionNum
    );

    if (!revision) {
        redirect(
            `/${org.slug}/${project.slug}/${specSlug}/revisions`
        );
    }

    let content = '';
    if (revision.content_key) {
        const { data } = await supabase.storage
            .from('spec-content')
            .download(revision.content_key);
        if (data) {
            content = await data.text();
        }
    }

    const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n*/, '');
    const allRevisions = (spec.revisions as any[])?.sort(
        (a, b) => b.revision_number - a.revision_number
    );
    const latestRevNum = allRevisions?.[0]?.revision_number || 1;
    const isLatest = revisionNum === latestRevNum;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-4">
                    <Link
                        href={`/${org.slug}/${project.slug}/${specSlug}/revisions`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm"
                    >
                        ← Back to revisions
                    </Link>
                </div>

                {/* Header */}
                <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {spec.name}
                                </h1>
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium rounded">
                                    v{revisionNum}
                                </span>
                                {isLatest && (
                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium rounded">
                                        Latest
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400">
                                {revision.summary || 'No summary provided'}
                            </p>
                            <div className="text-sm text-slate-500 mt-2">
                                by @{revision.author?.full_name || 'Unknown'} ·{' '}
                                {formatDate(revision.created_at)}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {!isLatest && (
                                <Link
                                    href={`/${org.slug}/${project.slug}/${specSlug}/revisions/${revisionNum}/restore`}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
                                >
                                    Restore This Version
                                </Link>
                            )}
                            {revisionNum > 1 && (
                                <Link
                                    href={`/${org.slug}/${project.slug}/${specSlug}/revisions/${revisionNum}/diff`}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white font-medium rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                                >
                                    Compare with v{revisionNum - 1}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                    <MarkdownRenderer content={contentWithoutFrontmatter} />
                </div>
            </div>
        </div>
    );
}
