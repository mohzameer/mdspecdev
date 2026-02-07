export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
    };

    return (
        <svg
            className={`animate-spin ${sizeClasses[size]} text-blue-500`}
            viewBox="0 0 24 24"
            fill="none"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
}

export function LoadingPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <LoadingSpinner size="lg" />
        </div>
    );
}

export function LoadingCard() {
    return (
        <div className="animate-pulse bg-white/5 rounded-xl border border-white/10 p-6">
            <div className="h-4 bg-slate-700 rounded w-3/4 mb-4" />
            <div className="h-3 bg-slate-700 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-700 rounded w-1/4" />
        </div>
    );
}
