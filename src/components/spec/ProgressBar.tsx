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

    const percentage = (progress / 100) * 100;
    const colorClass = getProgressColor(progress / 10); // scale back to 0-10 for color helper if it expects 0-10, or check helper

    const heightClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3',
    };

    return (
        <div className="w-full">
            <div
                className={cn(
                    'w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden',
                    heightClasses[size]
                )}
            >
                <div
                    className={cn('h-full transition-all duration-300', colorClass)}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
            {showLabel && (
                <p className="text-xs text-slate-400 mt-1">{progress.toFixed(0)}% Complete</p>
            )}
        </div>
    );
}
