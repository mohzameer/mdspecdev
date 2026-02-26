'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function RefreshButton() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleRefresh = () => {
        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <button
            onClick={handleRefresh}
            disabled={isPending}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh dashboard"
        >
            <svg
                className={`w-5 h-5 ${isPending ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
            </svg>
            <span className="sr-only">Refresh</span>
        </button>
    );
}
