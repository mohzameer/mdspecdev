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
    const { data: orgBySlug, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', orgSlug)
        .single();

    if (orgError) {
        console.error('[DiffPage] Org lookup error:', orgError);
    }

    if (orgBySlug) {
        org = orgBySlug;
    } else {
        console.log('[DiffPage] Org not found by slug, trying ID...');
        // Only try ID if it looks like a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgSlug);

        if (isUuid) {
            const { data: orgById } = await supabase
                .from('organizations')
                .select('id, name, slug')
                .eq('id', orgSlug)
                .single();

            if (orgById) {
                redirect(
                    `/${orgById.slug}/${projectSlug}/${specSlug}/revisions/${revisionNumber}/diff`
                );
            }
        }

        redirect('/dashboard');
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



    // 1. Fetch Spec Details First
    const { data: specData, error: specError } = await supabase
        .from('specs')
        .select('id, name, slug, project_id')
        .eq('project_id', project.id)
        .eq('slug', specSlug)
        .single();

    if (specError || !specData) {
        redirect(`/${orgSlug}/${projectSlug}`);
    }

    // 2. Fetch Revisions
    const { data: revisionsData } = await supabase
        .from('revisions')
        .select(`
            id,
            revision_number,
            created_at,
            content_key,
            summary,
            author:profiles(full_name)
        `)
        .eq('spec_id', specData.id);

    // 3. Fetch Comments
    const { data: commentsData } = await supabase
        .from('comments')
        .select(`
            id,
            content,
            heading_id,
            status,
            created_at,
            user:profiles(full_name)
        `)
    // .eq('spec_id', specData.id) // Comments might need a join if not directly linked, checking schema... 
    // Wait, comments usually link to threads. Let's look at original query: 
    // comments(...) from specs select usually implies a reverse relation.
    // Actually, the original query had `comments(...)`.
    // Let's check schema. comments table has `thread_id`. `comment_threads` has `spec_id`.
    // The original query likely relied on a view or a direct relation if comments has spec_id.
    // Checking schema... `comments` usually linked to threads. 
    // Let's check `comment_threads` first.

    const { data: threadsData } = await supabase
        .from('comment_threads')
        .select(`
            id,
            comments(
                id,
                content,
                heading_id,
                status,
                created_at,
                user:profiles(full_name)
            )
        `)
        .eq('spec_id', specData.id);

    // Flatten comments from threads for the view
    const comments = threadsData?.flatMap(t => t.comments) || [];

    const spec = {
        ...specData,
        revisions: revisionsData || [],
        comments: comments
    };


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
            // Use robust frontmatter stripping handling various newlines and spacing (handles stacked frontmatters)
            const frontmatterRegex = /^\s*---\r?\n[\s\S]*?\r?\n---\r?\n+/;
            let strippedText = text;
            while (frontmatterRegex.test(strippedText)) {
                strippedText = strippedText.replace(frontmatterRegex, '').trimStart();
            }
            return strippedText.trim();
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
                <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
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
                    hideSummaryPanel={true}
                />
            </div>
        </div>
    );
}
