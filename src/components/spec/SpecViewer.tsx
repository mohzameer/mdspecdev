'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
import { Profile } from '@/lib/types';
import { generatePdf } from '@/actions/pdf';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { CopySpecModal } from '@/components/spec/CopySpecModal';

export interface SpecInfo {
    id: string;
    name: string;
    slug: string;
    progress: number | null;
    status: any;
    maturity: any;
    tags: string[] | null;
    updated_at: string;
    created_at: string;
    archived_at: string | null;
    is_public: boolean;
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
    isPublicView?: boolean;
    canResolve?: boolean;
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
    isPublicView = false,
    canResolve = !isPublicView,
}: SpecViewerProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isTocOpen, setIsTocOpen] = useState(true);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
    const [activeQuotedText, setActiveQuotedText] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const router = useRouter();
    const markdownContainerRef = useRef<React.RefObject<HTMLElement | null> | null>(null);
    const shareMenuRef = useRef<HTMLDivElement>(null);

    // Close share menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
                setIsShareMenuOpen(false);
            }
        }

        if (isShareMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isShareMenuOpen]);

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

    const handleExportPdf = async () => {
        try {
            setIsGeneratingPdf(true);
            const base64Pdf = await generatePdf(spec.id);

            // Create a blob and download it
            const byteCharacters = atob(base64Pdf);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${spec.slug}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleTogglePublic = async () => {
        try {
            setIsSharing(true);
            const supabase = createClient();
            const { error } = await supabase
                .from('specs')
                .update({ is_public: !spec.is_public })
                .eq('id', spec.id);

            if (error) throw error;
            router.refresh();
        } catch (error) {
            console.error('Failed to toggle public access:', error);
            alert('Failed to update sharing settings.');
        } finally {
            setIsSharing(false);
        }
    };

    const isOwner = currentUser?.id === (spec.owner as any)?.id;
    const canEdit = !isPublicView && !spec.archived_at;

    return (
        <div className="relative">
            {spec.archived_at && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <svg
                        className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                        />
                    </svg>
                    <div>
                        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                            This specification is archived
                        </h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            It has been automatically archived due to inactivity. You can view it, but editing is disabled.
                        </p>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
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
                        {isOwner && !isPublicView && (
                            <div className="relative" ref={shareMenuRef}>
                                <button
                                    onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                                    className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm flex items-center gap-2 ${spec.is_public
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                        : 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50'
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                    {spec.is_public ? 'Public' : 'Private'}
                                </button>

                                {isShareMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                                        <div className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50 mb-1">
                                            Currently: <span className={spec.is_public ? "text-green-600 dark:text-green-400" : "text-slate-700 dark:text-slate-300"}>{spec.is_public ? 'Public' : 'Private'}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                handleTogglePublic();
                                                setIsShareMenuOpen(false);
                                            }}
                                            disabled={isSharing}
                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                        >
                                            {isSharing ? (
                                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : spec.is_public ? (
                                                <>
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                    Make Private
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Make Public
                                                </>
                                            )}
                                        </button>
                                        <div className="px-4 py-2 text-xs text-slate-400">
                                            {spec.is_public
                                                ? 'Anyone with the link can view.'
                                                : 'Only organization members can view.'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!isPublicView && (
                            <button
                                onClick={() => setIsCopyModalOpen(true)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2"
                                title="Duplicate spec to another project"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Duplicate
                            </button>
                        )}

                        <button
                            onClick={handleExportPdf}
                            disabled={isGeneratingPdf}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2"
                        >
                            {isGeneratingPdf ? (
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            PDF
                        </button>

                        <Link
                            href={`/${org.slug}/${project.slug}/${spec.slug}/revisions`}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white font-medium rounded-lg transition-colors text-sm"
                        >
                            History ({revisionCount})
                        </Link>
                        {canEdit && (
                            <Link
                                href={`/${org.slug}/${project.slug}/${spec.slug}/edit`}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors text-sm"
                            >
                                Edit
                            </Link>
                        )}
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
                    {(() => {
                        const hasThreads = threads !== undefined;
                        const activeUnresolved = hasThreads
                            ? threads.filter(t => !t.resolved).length
                            : unresolvedCount;
                        const totalThreads = hasThreads ? threads.length : 0;
                        const showUnresolved = activeUnresolved > 0;
                        const showTotal = !showUnresolved && hasThreads && totalThreads > 0;

                        if (showUnresolved || showTotal) {
                            return (
                                <>
                                    <span>·</span>
                                    <button
                                        onClick={() => setIsSidebarOpen(true)}
                                        className={`${showUnresolved ? "text-orange-500 dark:text-orange-400" : "text-slate-500 dark:text-slate-400"} hover:underline focus:outline-none`}
                                    >
                                        💬 {showUnresolved ? `${activeUnresolved} unresolved` : `${totalThreads} comments`}
                                    </button>
                                </>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>

            {aiSummary && (
                <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 shadow-sm overflow-hidden">
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
                    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
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
                            isReadOnly={isPublicView}
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
                    isReadOnly={isPublicView}
                    canResolve={canResolve}
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

            {isCopyModalOpen && (
                <CopySpecModal
                    specId={spec.id}
                    specName={spec.name}
                    onClose={() => setIsCopyModalOpen(false)}
                />
            )}
        </div>
    );
}
