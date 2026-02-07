'use client';

import { useMemo, useState } from 'react';
import { diff_match_patch, Diff } from 'diff-match-patch';

interface DiffViewerProps {
    oldContent: string;
    newContent: string;
}

type ViewMode = 'unified' | 'split';

export function DiffViewer({ oldContent, newContent }: DiffViewerProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('unified');

    const diffs = useMemo(() => {
        const dmp = new diff_match_patch();
        const diff = dmp.diff_main(oldContent, newContent);
        dmp.diff_cleanupSemantic(diff);
        return diff;
    }, [oldContent, newContent]);

    const stats = useMemo(() => {
        let additions = 0;
        let deletions = 0;
        diffs.forEach(([op, text]) => {
            if (op === 1) additions += text.length;
            if (op === -1) deletions += text.length;
        });
        return { additions, deletions };
    }, [diffs]);

    if (oldContent === newContent) {
        return (
            <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-8 text-center shadow-sm">
                <p className="text-slate-500 dark:text-slate-400">
                    No changes between these versions.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <div className="flex items-center gap-4">
                    <span className="text-green-600 dark:text-green-400 text-sm">
                        +{stats.additions} additions
                    </span>
                    <span className="text-red-600 dark:text-red-400 text-sm">
                        -{stats.deletions} deletions
                    </span>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => setViewMode('unified')}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${viewMode === 'unified'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                    >
                        Unified
                    </button>
                    <button
                        onClick={() => setViewMode('split')}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${viewMode === 'split'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                    >
                        Split
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-x-auto">
                {viewMode === 'unified' ? (
                    <UnifiedDiff diffs={diffs} />
                ) : (
                    <SplitDiff oldContent={oldContent} newContent={newContent} />
                )}
            </div>
        </div>
    );
}

function UnifiedDiff({ diffs }: { diffs: Diff[] }) {
    return (
        <pre className="font-mono text-sm whitespace-pre-wrap">
            {diffs.map(([op, text], index) => {
                if (op === 0) {
                    return (
                        <span key={index} className="text-slate-700 dark:text-slate-300">
                            {text}
                        </span>
                    );
                }
                if (op === -1) {
                    return (
                        <span
                            key={index}
                            className="bg-red-100 dark:bg-red-500/30 text-red-700 dark:text-red-300 line-through"
                        >
                            {text}
                        </span>
                    );
                }
                if (op === 1) {
                    return (
                        <span
                            key={index}
                            className="bg-green-100 dark:bg-green-500/30 text-green-700 dark:text-green-300"
                        >
                            {text}
                        </span>
                    );
                }
                return null;
            })}
        </pre>
    );
}

function SplitDiff({
    oldContent,
    newContent,
}: {
    oldContent: string;
    newContent: string;
}) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    return (
        <div className="grid grid-cols-2 gap-0.5">
            {/* Old side */}
            <div className="bg-red-50 dark:bg-red-500/5 rounded-l-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10 text-sm text-red-600 dark:text-red-400 font-medium">
                    Previous
                </div>
                <pre className="p-3 font-mono text-sm overflow-x-auto">
                    {oldLines.map((line, idx) => {
                        const isDeleted = !newLines.includes(line);
                        return (
                            <div
                                key={idx}
                                className={`${isDeleted
                                        ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                                        : 'text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                <span className="inline-block w-8 text-slate-400 dark:text-slate-600 text-right pr-2 select-none">
                                    {idx + 1}
                                </span>
                                {line || ' '}
                            </div>
                        );
                    })}
                </pre>
            </div>

            {/* New side */}
            <div className="bg-green-50 dark:bg-green-500/5 rounded-r-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10 text-sm text-green-600 dark:text-green-400 font-medium">
                    Current
                </div>
                <pre className="p-3 font-mono text-sm overflow-x-auto">
                    {newLines.map((line, idx) => {
                        const isAdded = !oldLines.includes(line);
                        return (
                            <div
                                key={idx}
                                className={`${isAdded
                                        ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                                        : 'text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                <span className="inline-block w-8 text-slate-400 dark:text-slate-600 text-right pr-2 select-none">
                                    {idx + 1}
                                </span>
                                {line || ' '}
                            </div>
                        );
                    })}
                </pre>
            </div>
        </div>
    );
}
