import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DiffViewer } from '@/components/diff/DiffViewer';
import { formatDate } from '@/lib/utils';

interface Props {
    params: Promise<{
        orgId: string;
        projectId: string;
        slug: string;
        revisionNumber: string;
    }>;
}

export default async function DiffPage({ params }: Props) {
    const { orgId, projectId, slug, revisionNumber } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
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
        author:profiles(full_name)
      )
    `
        )
        .eq('project_id', projectId)
        .eq('slug', slug)
        .is('archived_at', null)
        .single();

    if (!spec) {
        redirect(`/orgs/${orgId}/projects/${projectId}`);
    }

    const currentRevision = (spec.revisions as any[])?.find(
        (r) => r.revision_number === revisionNum
    );
    const previousRevision = (spec.revisions as any[])?.find(
        (r) => r.revision_number === revisionNum - 1
    );

    if (!currentRevision || !previousRevision) {
        redirect(`/orgs/${orgId}/projects/${projectId}/specs/${slug}/revisions`);
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
                        href={`/orgs/${orgId}/projects/${projectId}/specs/${slug}/revisions`}
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

                {/* Diff View */}
                <DiffViewer oldContent={oldContent} newContent={newContent} />
            </div>
        </div>
    );
}
