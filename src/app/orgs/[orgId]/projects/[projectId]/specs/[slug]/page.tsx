import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ProgressBar } from '@/components/spec/ProgressBar';
import {
    StatusBadge,
    MaturityBadge,
    TagsList,
} from '@/components/spec/StatusBadge';
import { MarkdownRenderer } from '@/components/spec/MarkdownRenderer';
import { formatRelativeTime, formatDate } from '@/lib/utils';

interface Props {
    params: Promise<{ orgId: string; projectId: string; slug: string }>;
}

export default async function SpecDetailPage({ params }: Props) {
    const { orgId, projectId, slug } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: spec } = await supabase
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
      created_at,
      updated_at,
      owner:profiles!specs_owner_id_fkey(id, full_name, avatar_url, email),
      project:projects(
        id,
        name,
        organization:organizations(id, name)
      ),
      revisions(id, revision_number, created_at, content_key, summary, author:profiles(full_name)),
      comment_threads(id, resolved)
    `
        )
        .eq('project_id', projectId)
        .eq('slug', slug)
        .is('archived_at', null)
        .single();

    if (!spec) {
        redirect(`/orgs/${orgId}/projects/${projectId}`);
    }

    const latestRevision = (spec.revisions as any[])?.sort(
        (a, b) => b.revision_number - a.revision_number
    )[0];

    let content = '';
    if (latestRevision?.content_key) {
        const { data } = await supabase.storage
            .from('spec-content')
            .download(latestRevision.content_key);
        if (data) {
            content = await data.text();
        }
    }

    const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n*/, '');
    const unresolvedCount =
        (spec.comment_threads as any[])?.filter((t) => !t.resolved).length || 0;
    const revisionCount = (spec.revisions as any[])?.length || 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <div className="mb-4 text-sm">
                    <Link
                        href="/dashboard"
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                        Dashboard
                    </Link>
                    <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                    <Link
                        href={`/orgs/${orgId}`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                        {(spec.project as any)?.organization?.name}
                    </Link>
                    <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                    <Link
                        href={`/orgs/${orgId}/projects/${projectId}`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                        {(spec.project as any)?.name}
                    </Link>
                </div>

                {/* Header */}
                <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-6 mb-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                {spec.name}
                            </h1>
                            <div className="flex items-center gap-2 flex-wrap">
                                <StatusBadge status={spec.status} />
                                <MaturityBadge maturity={spec.maturity} />
                                <TagsList tags={spec.tags} max={5} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href={`/orgs/${orgId}/projects/${projectId}/specs/${slug}/edit`}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                New Revision
                            </Link>
                            <Link
                                href={`/orgs/${orgId}/projects/${projectId}/specs/${slug}/revisions`}
                                className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white font-medium rounded-lg transition-colors border border-slate-200 dark:border-white/10"
                            >
                                Revisions ({revisionCount})
                            </Link>
                        </div>
                    </div>

                    {spec.progress !== null && (
                        <div className="mb-4 max-w-md">
                            <ProgressBar progress={spec.progress} />
                        </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span>Owner: @{(spec.owner as any)?.full_name || 'Unknown'}</span>
                        <span>·</span>
                        <span>Created {formatDate(spec.created_at)}</span>
                        <span>·</span>
                        <span>Updated {formatRelativeTime(spec.updated_at)}</span>
                        {unresolvedCount > 0 && (
                            <>
                                <span>·</span>
                                <span className="text-orange-500 dark:text-orange-400">
                                    💬 {unresolvedCount} unresolved comments
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-8 shadow-sm">
                    <MarkdownRenderer content={contentWithoutFrontmatter} />
                </div>
            </div>
        </div>
    );
}
