import Link from 'next/link';
import { ProgressBar } from '@/components/spec/ProgressBar';
import { StatusBadge, TagsList } from '@/components/spec/StatusBadge';
import { formatRelativeTime } from '@/lib/utils';
import { Spec, Project, Organization, Profile, CommentThread, Comment, Revision } from '@/lib/types';

// Define a type that matches what the dashboard (and search) query returns
export interface SpecWithRelations extends Omit<Partial<Spec>, 'project' | 'owner' | 'comment_threads' | 'revisions'> {
    id: string;
    name: string;
    slug: string;
    progress: number | null;
    status: any; // using any to avoid strict type mismatch with database enums vs string
    maturity: any;
    tags: string[] | null;
    updated_at: string;
    archived_at: string | null;
    project: {
        id: string;
        name: string;
        slug: string;
        organization: { id: string; name: string; slug: string }
    };
    owner: { full_name: string | null; avatar_url: string | null } | null;
    comment_threads?: { id: string; resolved: boolean; comments: { id: string; deleted: boolean }[] }[];
    revisions?: { id: string }[];
}

interface SpecCardProps {
    spec: SpecWithRelations;
    showArchivedStyle?: boolean;
}

export function SpecCard({ spec, showArchivedStyle = false }: SpecCardProps) {
    // Calculate stats safely
    const unresolvedCount =
        spec.comment_threads?.filter((t) => !t.resolved && t.comments?.some((c) => !c.deleted)).length || 0;
    const revisionCount = spec.revisions?.length || 0;
    const isArchived = !!spec.archived_at;
    const displayArchived = showArchivedStyle || isArchived;

    return (
        <Link
            href={`/${spec.project.organization.slug}/${spec.project.slug}/${spec.slug}`}
            className={`flex flex-col h-full p-6 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 transition-all duration-200 group shadow-sm ${displayArchived ? 'opacity-75 grayscale' : ''}`}
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
}
