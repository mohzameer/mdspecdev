'use client';

import { useState, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/spec/MarkdownRenderer';

interface RenderedAstDiffProps {
    oldContent: string;
    newContent: string;
}

export function RenderedAstDiff({ oldContent, newContent }: RenderedAstDiffProps) {
    const [astSections, setAstSections] = useState<any[] | null>(null);

    useEffect(() => {
        let mounted = true;
        import('@/lib/ast-diff-utils').then(({ computeAstDiffSections }) => {
            computeAstDiffSections(oldContent, newContent).then(sections => {
                if (mounted) setAstSections(sections);
            });
        });
        return () => { mounted = false; };
    }, [oldContent, newContent]);

    if (!astSections) {
        return (
            <div className="prose prose-slate dark:prose-invert max-w-none">
                <div className="animate-pulse space-y-4 pt-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                </div>
            </div>
        );
    }

    return <MarkdownRenderer precomputedSections={astSections} disableHeadingIds={true} />;
}
