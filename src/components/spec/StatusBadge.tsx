import { cn, getStatusStyle, getMaturityStyle } from '@/lib/utils';
import type { Status, Maturity } from '@/lib/types';

interface StatusBadgeProps {
    status: Status | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    if (!status) return null;

    const labels: Record<Status, string> = {
        planned: 'Planned',
        'in-progress': 'In Progress',
        completed: 'Completed',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                getStatusStyle(status)
            )}
        >
            {labels[status]}
        </span>
    );
}

interface MaturityBadgeProps {
    maturity: Maturity | null;
}

export function MaturityBadge({ maturity }: MaturityBadgeProps) {
    if (!maturity) return null;

    const labels: Record<Maturity, string> = {
        draft: 'Draft',
        review: 'Review',
        stable: 'Stable',
        deprecated: 'Deprecated',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                getMaturityStyle(maturity)
            )}
        >
            {labels[maturity]}
        </span>
    );
}

interface TagsListProps {
    tags: string[] | null;
    max?: number;
}

export function TagsList({ tags, max = 3 }: TagsListProps) {
    if (!tags || tags.length === 0) return null;

    const displayTags = tags.slice(0, max);
    const remaining = tags.length - max;

    return (
        <div className="flex flex-wrap gap-1">
            {displayTags.map((tag) => (
                <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300"
                >
                    #{tag}
                </span>
            ))}
            {remaining > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-400">
                    +{remaining}
                </span>
            )}
        </div>
    );
}
