'use client';

import { useState, useEffect } from 'react';

interface RenderedAstDiffProps {
    oldContent: string;
    newContent: string;
}

export function RenderedAstDiff({ oldContent, newContent }: RenderedAstDiffProps) {
    const [astHtml, setAstHtml] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        import('@/lib/ast-diff-utils').then(({ computeAstDiffHtml }) => {
            computeAstDiffHtml(oldContent, newContent).then(html => {
                if (mounted) setAstHtml(html);
            });
        });
        return () => { mounted = false; };
    }, [oldContent, newContent]);

    return (
        <div className="prose prose-slate dark:prose-invert max-w-none">
            {astHtml ? (
                <div dangerouslySetInnerHTML={{ __html: astHtml }} />
            ) : (
                <div className="animate-pulse space-y-4 pt-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                </div>
            )}
        </div>
    );
}
