import Link from 'next/link';
import { ProgressBar } from '@/components/spec/ProgressBar';
import { StatusBadge } from '@/components/spec/StatusBadge';
import { formatRelativeTime } from '@/lib/utils';
import { SpecWithRelations } from './SpecCard';

interface SpecListItemProps {
    spec: SpecWithRelations;
    showArchivedStyle?: boolean;
}

export function SpecListItem({ spec, showArchivedStyle = false }: SpecListItemProps) {
    // Calculate stats safely
    const unresolvedCount =
        spec.comment_threads?.filter((t) => !t.resolved && t.comments?.some((c) => !c.deleted)).length || 0;
    const revisionCount = spec.revisions?.length || 0;
    const isArchived = !!spec.archived_at;
    const displayArchived = showArchivedStyle || isArchived;

    return (
        <Link
            href={`/${spec.project.organization.slug}/${spec.project.slug}/${spec.slug}`}
            className={`group flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 transition-all duration-200 shadow-sm ${displayArchived ? 'opacity-75 grayscale' : ''}`}
        >
            {/* Left Section: Icon + Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xl">
                    📄
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {spec.name}
                        </h3>
                        <StatusBadge status={spec.status} />
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>@{spec.owner?.full_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(spec.updated_at)}</span>
                    </div>
                </div>
            </div>

            {/* Middle Section: Progress Bar */}
            {spec.progress !== null && (
                <div className="hidden md:flex flex-col w-32 mx-6">
                    <ProgressBar progress={spec.progress} size="sm" showLabel={false} />
                </div>
            )}

            {/* Right Section: Stats & Tags */}
            <div className="flex items-center gap-6 pl-4 border-l border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-500">
                    {unresolvedCount > 0 && (
                        <div className="flex items-center gap-1 text-orange-500 dark:text-orange-400" title="Unresolved discussions">
                            <span>💬</span>
                            <span className="font-medium">{unresolvedCount}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1" title="Revisions">
                        <span>📝</span>
                        <span>{revisionCount}</span>
                    </div>
                </div>

                <div className="text-slate-300 dark:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </Link>
    );
}
