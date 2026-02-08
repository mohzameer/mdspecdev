'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import { diff_match_patch, Diff } from 'diff-match-patch';
import { MarkdownRenderer } from '../spec/MarkdownRenderer';

interface DiffViewerProps {
    oldContent: string;
    newContent: string;
}

type ViewMode = 'unified' | 'split' | 'rendered';

interface Change {
    type: 'added' | 'removed' | 'modified';
    lineNumber: number;
    section: string;
    content: string;
}

export function DiffViewer({ oldContent, newContent }: DiffViewerProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('unified');
    const [showSummary, setShowSummary] = useState(true);
    const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
    const changeRefs = useRef<(HTMLDivElement | null)[]>([]);

    const diffs = useMemo(() => {
        const dmp = new diff_match_patch();
        const diff = dmp.diff_main(oldContent, newContent);
        dmp.diff_cleanupSemantic(diff);
        return diff;
    }, [oldContent, newContent]);

    const stats = useMemo(() => {
        let additions = 0;
        let deletions = 0;
        let addedLines = 0;
        let removedLines = 0;

        diffs.forEach(([op, text]) => {
            if (op === 1) {
                additions += text.length;
                addedLines += (text.match(/\n/g) || []).length;
            }
            if (op === -1) {
                deletions += text.length;
                removedLines += (text.match(/\n/g) || []).length;
            }
        });
        return { additions, deletions, addedLines, removedLines };
    }, [diffs]);

    // Extract section-level changes
    const sectionChanges = useMemo(() => {
        const changes: Change[] = [];
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');

        let currentSection = 'Introduction';
        let lineNumber = 0;

        // Find heading changes
        const oldHeadings = oldLines.filter(l => l.startsWith('#')).map(l => l.replace(/^#+\s*/, ''));
        const newHeadings = newLines.filter(l => l.startsWith('#')).map(l => l.replace(/^#+\s*/, ''));

        // Added headings
        newHeadings.forEach((h, i) => {
            if (!oldHeadings.includes(h)) {
                changes.push({
                    type: 'added',
                    lineNumber: newLines.findIndex(l => l.includes(h)) + 1,
                    section: 'Sections',
                    content: `Added section: "${h}"`
                });
            }
        });

        // Removed headings
        oldHeadings.forEach((h, i) => {
            if (!newHeadings.includes(h)) {
                changes.push({
                    type: 'removed',
                    lineNumber: oldLines.findIndex(l => l.includes(h)) + 1,
                    section: 'Sections',
                    content: `Removed section: "${h}"`
                });
            }
        });

        // Identify significant content changes by section
        let oldSectionContent: Record<string, string[]> = {};
        let newSectionContent: Record<string, string[]> = {};
        let currentSec = 'Top';

        oldLines.forEach(line => {
            if (line.startsWith('#')) {
                currentSec = line.replace(/^#+\s*/, '');
            }
            if (!oldSectionContent[currentSec]) oldSectionContent[currentSec] = [];
            oldSectionContent[currentSec].push(line);
        });

        currentSec = 'Top';
        newLines.forEach(line => {
            if (line.startsWith('#')) {
                currentSec = line.replace(/^#+\s*/, '');
            }
            if (!newSectionContent[currentSec]) newSectionContent[currentSec] = [];
            newSectionContent[currentSec].push(line);
        });

        // Find modified sections
        Object.keys({ ...oldSectionContent, ...newSectionContent }).forEach(section => {
            const oldText = (oldSectionContent[section] || []).join('\n');
            const newText = (newSectionContent[section] || []).join('\n');

            if (oldText !== newText && oldSectionContent[section] && newSectionContent[section]) {
                const oldLen = oldText.length;
                const newLen = newText.length;
                const diff = newLen - oldLen;
                if (Math.abs(diff) > 10) {
                    changes.push({
                        type: 'modified',
                        lineNumber: newLines.findIndex(l => l.includes(section)) + 1,
                        section: section,
                        content: diff > 0
                            ? `Content expanded (+${diff} chars)`
                            : `Content reduced (${diff} chars)`
                    });
                }
            }
        });

        return changes;
    }, [oldContent, newContent]);

    // Navigate to next/previous change
    const navigateChange = useCallback((direction: 'next' | 'prev') => {
        const changeElements = document.querySelectorAll('[data-change-marker]');
        if (changeElements.length === 0) return;

        let newIndex = currentChangeIndex;
        if (direction === 'next') {
            newIndex = Math.min(currentChangeIndex + 1, changeElements.length - 1);
        } else {
            newIndex = Math.max(currentChangeIndex - 1, 0);
        }

        setCurrentChangeIndex(newIndex);
        changeElements[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [currentChangeIndex]);

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
        <div className="space-y-4">
            {/* Summary Panel */}
            {showSummary && sectionChanges.length > 0 && (
                <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Summary of Changes</h3>
                        <button
                            onClick={() => setShowSummary(false)}
                            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            Hide
                        </button>
                    </div>
                    <div className="space-y-2">
                        {sectionChanges.slice(0, 5).map((change, i) => (
                            <div
                                key={i}
                                className={`flex items-start gap-2 text-sm ${change.type === 'added' ? 'text-green-600 dark:text-green-400' :
                                        change.type === 'removed' ? 'text-red-600 dark:text-red-400' :
                                            'text-blue-600 dark:text-blue-400'
                                    }`}
                            >
                                <span className="font-mono text-xs mt-0.5">
                                    {change.type === 'added' ? '+' : change.type === 'removed' ? '−' : '~'}
                                </span>
                                <span>{change.content}</span>
                            </div>
                        ))}
                        {sectionChanges.length > 5 && (
                            <p className="text-xs text-slate-400">
                                +{sectionChanges.length - 5} more changes
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Main Diff Panel */}
            <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <div className="flex items-center gap-4">
                        <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                            +{stats.addedLines} lines
                        </span>
                        <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                            −{stats.removedLines} lines
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Navigation buttons */}
                        <div className="flex items-center gap-1 border-r border-slate-200 dark:border-white/10 pr-4">
                            <button
                                onClick={() => navigateChange('prev')}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Previous change"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </button>
                            <button
                                onClick={() => navigateChange('next')}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Next change"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>

                        {/* View mode buttons */}
                        <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('unified')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'unified'
                                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                Unified
                            </button>
                            <button
                                onClick={() => setViewMode('split')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'split'
                                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                Split
                            </button>
                            <button
                                onClick={() => setViewMode('rendered')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'rendered'
                                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                Rendered
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 overflow-x-auto">
                    {viewMode === 'unified' && <UnifiedDiff diffs={diffs} />}
                    {viewMode === 'split' && <SplitDiff oldContent={oldContent} newContent={newContent} />}
                    {viewMode === 'rendered' && <RenderedDiff oldContent={oldContent} newContent={newContent} />}
                </div>
            </div>
        </div>
    );
}

function UnifiedDiff({ diffs }: { diffs: Diff[] }) {
    let changeIndex = 0;

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
                    changeIndex++;
                    return (
                        <span
                            key={index}
                            data-change-marker={changeIndex}
                            className="bg-red-100 dark:bg-red-500/30 text-red-700 dark:text-red-300 line-through"
                        >
                            {text}
                        </span>
                    );
                }
                if (op === 1) {
                    changeIndex++;
                    return (
                        <span
                            key={index}
                            data-change-marker={changeIndex}
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
                                data-change-marker={isDeleted ? idx : undefined}
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

function RenderedDiff({
    oldContent,
    newContent,
}: {
    oldContent: string;
    newContent: string;
}) {
    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Old side - Rendered */}
            <div className="bg-red-50/50 dark:bg-red-500/5 rounded-lg overflow-hidden border border-red-200 dark:border-red-500/20">
                <div className="px-4 py-2 border-b border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-500/10">
                    Previous Version
                </div>
                <div className="p-4">
                    <MarkdownRenderer content={oldContent} disableHeadingIds={true} />
                </div>
            </div>

            {/* New side - Rendered */}
            <div className="bg-green-50/50 dark:bg-green-500/5 rounded-lg overflow-hidden border border-green-200 dark:border-green-500/20">
                <div className="px-4 py-2 border-b border-green-200 dark:border-green-500/20 text-sm text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-500/10">
                    Current Version
                </div>
                <div className="p-4">
                    <MarkdownRenderer content={newContent} disableHeadingIds={true} />
                </div>
            </div>
        </div>
    );
}
