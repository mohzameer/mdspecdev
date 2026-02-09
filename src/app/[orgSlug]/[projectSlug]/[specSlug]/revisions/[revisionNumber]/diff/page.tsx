import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DiffViewer } from '@/components/diff/DiffViewer';
import { SummaryCard } from '@/components/diff/AISummaryCard';
import { formatDate } from '@/lib/utils';

interface Props {
    params: Promise<{
        orgSlug: string;
        projectSlug: string;
        specSlug: string;
        revisionNumber: string;
    }>;
}

export default async function DiffPage({ params }: Props) {
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
                `/${orgById.slug}/${projectSlug}/${specSlug}/revisions/${revisionNumber}/diff`
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
                `/${org.slug}/${projectById.slug}/${specSlug}/revisions/${revisionNumber}/diff`
            );
        } else {
            redirect(`/${org.slug}`);
        }
    }

    const revisionNum = parseInt(revisionNumber);

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
        revision_number,
        created_at,
        content_key,
        summary,
        author:profiles(full_name)
      ),
      comments(
        id,
        content,
        heading_id,
        status,
        created_at,
        user:profiles(full_name)
      )
    `
        )
        .eq('project_id', project.id)
        .eq('slug', specSlug)
        .is('archived_at', null)
        .single();

    if (!spec) {
        redirect(`/${org.slug}/${project.slug}`);
    }

    const currentRevision = (spec.revisions as any[])?.find(
        (r) => r.revision_number === revisionNum
    );
    const previousRevision = (spec.revisions as any[])?.find(
        (r) => r.revision_number === revisionNum - 1
    );

    if (!currentRevision || !previousRevision) {
        redirect(
            `/${org.slug}/${project.slug}/${specSlug}/revisions`
        );
    }

    async function getContent(contentKey: string): Promise<string> {
        const { data } = await supabase.storage
            .from('spec-content')
            .download(contentKey);
        if (data) {
            const text = await data.text();
            return text.replace(/^---[\s\S]*?---\n*/, '');
        }
        return '';
    }

    const [oldContent, newContent] = await Promise.all([
        getContent(previousRevision.content_key),
        getContent(currentRevision.content_key),
    ]);

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
                <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-6 mb-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                        Comparing v{revisionNum - 1} → v{revisionNum}
                    </h1>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded">
                                    v{revisionNum - 1}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 text-sm">
                                    Previous
                                </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 text-sm">
                                {previousRevision.summary || 'No summary'}
                            </p>
                            <p className="text-slate-500 text-xs mt-1">
                                by @{previousRevision.author?.full_name || 'Unknown'} ·{' '}
                                {formatDate(previousRevision.created_at)}
                            </p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium rounded">
                                    v{revisionNum}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 text-sm">
                                    Current
                                </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 text-sm">
                                {currentRevision.summary || 'No summary'}
                            </p>
                            <p className="text-slate-500 text-xs mt-1">
                                by @{currentRevision.author?.full_name || 'Unknown'} ·{' '}
                                {formatDate(currentRevision.created_at)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* AI Summary Card */}
                <div className="mb-6">
                    <SummaryCard revisionId={currentRevision.id} />
                </div>

                {/* Diff View */}
                <DiffViewer
                    oldContent={oldContent}
                    newContent={newContent}
                    comments={spec.comments || []}
                />
            </div>
        </div>
    );
}
