
'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/spec/MarkdownRenderer';
import { TableOfContents } from '@/components/spec/TableOfContents';
import { CommentSidebar } from '@/components/comments/CommentSidebar';
import { SelectionPopover } from '@/components/comments/SelectionPopover';
import { ProgressBar } from '@/components/spec/ProgressBar';
import {
    StatusBadge,
    MaturityBadge,
    TagsList,
} from '@/components/spec/StatusBadge';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { useComments } from '@/hooks/useComments';
import { Profile, Spec, Project, Organization } from '@/lib/types';

interface SpecInfo {
    id: string;
    name: string;
    slug: string;
    progress: number | null;
    status: any;
    maturity: any;
    tags: string[] | null;
    updated_at: string;
    created_at: string;
    owner: any;
}

interface SpecViewerProps {
    content: string;
    spec: SpecInfo;
    org: { slug: string; name: string };
    project: { slug: string; name: string };
    currentUser: Profile | null;
    unresolvedCount: number;
    revisionCount: number;
    aiSummary?: string;
    latestRevisionNumber: number;
}

export function SpecViewer({
    content,
    spec,
    org,
    project,
    currentUser,
    unresolvedCount,
    revisionCount,
    aiSummary,
    latestRevisionNumber,
}: SpecViewerProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isTocOpen, setIsTocOpen] = useState(true);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
    const [activeQuotedText, setActiveQuotedText] = useState<string | null>(null);
    const markdownContainerRef = useRef<React.RefObject<HTMLElement | null> | null>(null);

    // Fetch threads for highlight rendering
    const { threads } = useComments(spec.id);

    const handleCommentClick = (headingId: string) => {
        setActiveHeadingId(headingId);
        setActiveQuotedText(null);
        setIsSidebarOpen(true);
    };

    const handleTextSelect = useCallback((selectedText: string, nearestHeadingId: string) => {
        setActiveQuotedText(selectedText);
        setActiveHeadingId(nearestHeadingId || 'general');
        setIsSidebarOpen(true);
    }, []);

    const handleHighlightClick = useCallback((threadId: string) => {
        // Find the thread and set it as active
        const thread = threads?.find(t => t.id === threadId);
        if (thread) {
            setActiveHeadingId(thread.anchor_heading_id);
            setActiveQuotedText(thread.quoted_text || null);
            setIsSidebarOpen(true);
        }
    }, [threads]);

    const handleContainerRef = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
        markdownContainerRef.current = ref;
    }, []);

    return (
        <div className="relative">
            {/* Header Section */}
            <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-6 mb-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            {spec.name}
                        </h1>
                        <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={spec.status} />
                            <MaturityBadge maturity={spec.maturity} />
                            <TagsList tags={spec.tags} max={5} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`/${org.slug}/${project.slug}/${spec.slug}/revisions`}
                            className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white font-medium rounded-lg transition-colors text-sm"
                        >
                            History ({revisionCount})
                        </Link>
                        <Link
                            href={`/${org.slug}/${project.slug}/${spec.slug}/edit`}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors text-sm"
                        >
                            Edit
                        </Link>
                    </div>
                </div>

                {spec.progress !== null && (
                    <div className="mb-4">
                        <ProgressBar progress={spec.progress} showLabel={false} />
                    </div>
                )}

                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span>
                        By @{(spec.owner as any)?.full_name || 'Unknown'}
                    </span>
                    <span>·</span>
                    <span>
                        Updated {formatRelativeTime(spec.updated_at)}
                    </span>
                    <span>·</span>
                    <span>
                        Created {formatDate(spec.created_at)}
                    </span>
                    {unresolvedCount > 0 && (
                        <>
                            <span>·</span>
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="text-orange-500 dark:text-orange-400 hover:underline focus:outline-none"
                            >
                                💬 {unresolvedCount} unresolved
                            </button>
                        </>
                    )}
                </div>
            </div>

            {aiSummary && (
                <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 mb-6 shadow-sm overflow-hidden">
                    <div
                        className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                    >
                        <div className="flex items-center gap-2">
                            <svg
                                className={`w-5 h-5 text-slate-400 transition-transform ${isSummaryOpen ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <h3 className="font-semibold text-slate-900 dark:text-white">Summary of Changes</h3>
                        </div>
                        {latestRevisionNumber > 1 && (
                            <Link
                                href={`/${org.slug}/${project.slug}/${spec.slug}/revisions/${latestRevisionNumber}/diff`}
                                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-md transition-colors flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Show Difference
                            </Link>
                        )}
                    </div>

                    {isSummaryOpen && (
                        <div className="px-6 pb-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                            <MarkdownRenderer content={aiSummary} disableHeadingIds={true} />
                        </div>
                    )}
                </div>
            )}



            <div className={`flex items-start transition-all duration-300 ${isSidebarOpen && !isTocOpen ? 'gap-2' : 'gap-6'}`}>
                <div className="flex-1 min-w-0 relative">
                    {/* Content Section */}
                    <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-8 shadow-sm">
                        <MarkdownRenderer
                            content={content}
                            onCommentClick={handleCommentClick}
                            onHighlightClick={handleHighlightClick}
                            threads={threads}
                            containerRefCallback={handleContainerRef}
                        />
                    </div>

                    {/* Selection Popover - rendered relative to the content area */}
                    {markdownContainerRef.current && (
                        <SelectionPopover
                            containerRef={markdownContainerRef.current as React.RefObject<HTMLElement | null>}
                            onComment={handleTextSelect}
                        />
                    )}
                </div>

                {/* Table of Contents - Hidden on smaller screens, always visible on xl */}
                <div className={`hidden xl:block flex-shrink-0 sticky top-24 self-start transition-all duration-300 ${!isSidebarOpen || isTocOpen ? 'w-64' : 'w-4'}`}>
                    <div className="relative">
                        {isSidebarOpen && (
                            <button
                                onClick={() => setIsTocOpen(!isTocOpen)}
                                className={`absolute top-0 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-400 hover:text-blue-600 shadow-sm z-10 transition-all duration-300 ${isTocOpen ? '-left-3' : 'left-0'}`}
                                title={isTocOpen ? "Collapse ToC" : "Expand ToC"}
                            >
                                <svg className={`w-3 h-3 transition-transform ${isTocOpen ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <div className={`transition-opacity duration-300 ${!isSidebarOpen || isTocOpen ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'} ${isSidebarOpen ? 'pl-6' : ''}`}>
                            <TableOfContents content={content} />
                        </div>
                    </div>
                </div>

                <CommentSidebar
                    specId={spec.id}
                    currentUser={currentUser}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    activeHeadingId={activeHeadingId}
                    activeQuotedText={activeQuotedText}
                    orgSlug={org.slug}
                />
            </div>

            {!isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="fixed bottom-8 right-8 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors z-30"
                    title="Open Comments"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </button>
            )}
        </div>
    );
}
