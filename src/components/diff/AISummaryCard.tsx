'use client';

import { useEffect, useState } from 'react';

interface SummaryCardProps {
    revisionId: string;
}

export function SummaryCard({ revisionId }: SummaryCardProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/revisions/${revisionId}/ai-summary`, {
                    method: 'POST'
                });

                const data = await response.json();

                if (!response.ok) {
                    // Don't show error for missing API key - just hide the card
                    if (data.error?.includes('API key')) {
                        setSummary(null);
                    } else {
                        setError(data.error || 'Failed to load summary');
                    }
                    return;
                }

                setSummary(data.summary);
            } catch (err) {
                setError('Failed to load summary');
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [revisionId]);

    // Don't render if no summary and not loading
    if (!loading && !summary && !error) {
        return null;
    }

    // Don't show error state - just hide if there's an issue
    if (error) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Summary of Changes</h3>
            </div>

            {loading ? (
                <div className="flex items-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="ml-3 text-slate-500 dark:text-slate-400 text-sm">Loading summary...</span>
                </div>
            ) : summary ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">
                        {summary}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

// Keep the old name as an alias for backwards compatibility
export { SummaryCard as AISummaryCard };
