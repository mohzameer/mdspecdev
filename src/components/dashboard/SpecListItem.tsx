import Link from 'next/link';
import { ProgressBar } from '@/components/spec/ProgressBar';
import { formatRelativeTime } from '@/lib/utils';
import { SpecWithRelations } from './SpecCard';

interface SpecListItemProps {
    spec: SpecWithRelations;
    showArchivedStyle?: boolean;
}

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
    'planned': { dot: 'bg-slate-400', label: 'Planned' },
    'in-progress': { dot: 'bg-blue-500', label: 'In Progress' },
    'completed': { dot: 'bg-green-500', label: 'Completed' },
};

const MATURITY_CONFIG: Record<string, { color: string; label: string }> = {
    'draft': { color: 'text-slate-400 dark:text-slate-500', label: 'Draft' },
    'review': { color: 'text-amber-500 dark:text-amber-400', label: 'Review' },
    'stable': { color: 'text-green-600 dark:text-green-400', label: 'Stable' },
    'deprecated': { color: 'text-red-500 dark:text-red-400', label: 'Deprecated' },
};

export function SpecListItem({ spec, showArchivedStyle = false }: SpecListItemProps) {
    const unresolvedCount =
        spec.comment_threads?.filter((t) => !t.resolved && t.comments?.some((c) => !c.deleted)).length || 0;
    const revisionCount = spec.revisions?.length || 0;
    const isArchived = !!spec.archived_at;
    const displayArchived = showArchivedStyle || isArchived;

    const statusCfg = spec.status ? STATUS_CONFIG[spec.status] : null;
    const maturityCfg = spec.maturity ? MATURITY_CONFIG[spec.maturity] : null;

    return (
        <Link
            href={`/${spec.project.organization.slug}/${spec.project.slug}/${spec.slug}`}
            className={`group grid items-center gap-3 px-3 py-2.5 rounded-md bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600 transition-colors duration-100 ${displayArchived ? 'opacity-60' : ''}`}
            style={{ gridTemplateColumns: '16px 1fr auto auto auto auto' }}
        >
            {/* Status dot */}
            <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusCfg?.dot ?? 'bg-slate-300 dark:bg-slate-600'}`}
                title={statusCfg?.label ?? 'No status'}
            />

            {/* Name + maturity */}
            <div className="min-w-0 flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                    {spec.name}
                </span>
                {maturityCfg && (
                    <span className={`hidden sm:inline text-xs font-medium ${maturityCfg.color} flex-shrink-0`}>
                        {maturityCfg.label}
                    </span>
                )}
            </div>

            {/* Progress bar */}
            <div className="hidden md:flex w-20 flex-shrink-0">
                {spec.progress !== null ? (
                    <ProgressBar progress={spec.progress} size="sm" showLabel={false} />
                ) : (
                    <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                )}
            </div>

            {/* Unresolved comments */}
            <div className="flex items-center gap-1 w-10 justify-end flex-shrink-0">
                {unresolvedCount > 0 ? (
                    <span className="flex items-center gap-0.5 text-xs font-medium text-orange-500 dark:text-orange-400" title="Unresolved comments">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {unresolvedCount}
                    </span>
                ) : (
                    <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                )}
            </div>

            {/* Revisions */}
            <div className="hidden sm:flex items-center gap-0.5 w-10 justify-end flex-shrink-0 text-xs text-slate-400 dark:text-slate-500" title="Revisions">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>v{revisionCount}</span>
            </div>

            {/* Updated at */}
            <div className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 w-20 text-right flex-shrink-0 tabular-nums">
                {formatRelativeTime(spec.updated_at)}
            </div>
        </Link>
    );
}
