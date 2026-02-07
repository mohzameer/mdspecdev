import { cn, getProgressColor } from '@/lib/utils';

interface ProgressBarProps {
    progress: number | null;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
    progress,
    showLabel = true,
    size = 'md',
}: ProgressBarProps) {
    if (progress === null) return null;

    const percentage = (progress / 10) * 100;
    const colorClass = getProgressColor(progress);

    const heightClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3',
    };

    return (
        <div className="w-full">
            <div
                className={cn(
                    'w-full bg-slate-700 rounded-full overflow-hidden',
                    heightClasses[size]
                )}
            >
                <div
                    className={cn('h-full transition-all duration-300', colorClass)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <p className="text-xs text-slate-400 mt-1">{progress.toFixed(1)}/10</p>
            )}
        </div>
    );
}
