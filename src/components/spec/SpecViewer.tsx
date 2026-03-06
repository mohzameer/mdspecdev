'use client';

import { useState, useRef, useCallback, useEffect, useTransition, useMemo, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

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
import { Profile, Status, Maturity } from '@/lib/types';
import { generatePdf } from '@/actions/pdf';
import { unlinkSpec, deleteSpec } from '@/app/actions/spec';
import { moveSpecsToFolder } from '@/app/actions/folders';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { CopySpecModal } from '@/components/spec/CopySpecModal';
import { FolderPickerModal } from '@/components/spec/FolderPickerModal';
import { useStickyHeader } from '@/components/providers/StickyHeaderProvider';
import { RenderedAstDiff } from '@/components/diff/RenderedAstDiff';
import { SpecOptionsModal } from '@/components/spec/SpecOptionsModal';

export interface SpecInfo {
    id: string;
    name: string;
    slug: string;
    file_name?: string | null;
    folder_id?: string | null;
    progress: number | null;
    status: Status | null;
    maturity: Maturity | null;
    tags: string[] | null;
    updated_at: string;
    created_at: string;
    archived_at: string | null;
    source_spec_id?: string | null;
    is_public: boolean;
    owner: { id: string; full_name?: string | null } | null;
}

export interface DiffHighlight {
    type: 'added' | 'modified';
    /** Text fragments that were added (op=1 from diff_match_patch). Used for inline marks. */
    addedTexts: string[];
}

interface SpecViewerProps {
    content: string;
    previousContent?: string;
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
    frontmatter?: string;
    folders?: import('@/lib/types').SpecFolder[];
}



export function SpecViewer({
    content,
    previousContent,
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
    frontmatter,
    folders = [],
}: SpecViewerProps) {
    // Line-level diff: find which lines in the new content were added (green) or modified (yellow).
    // Inserted line identical to a deleted line = context re-insert, skip.
    // Inserted line with >80% word overlap to a deleted line = modified (yellow).
    // Inserted with no similar deleted counterpart = added (green).






    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isTocOpen, setIsTocOpen] = useState(false);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [isShowingDiff, setIsShowingDiff] = useState(() => !!(previousContent && previousContent !== content));
    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
    const [activeQuotedText, setActiveQuotedText] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [isMoveToFolderOpen, setIsMoveToFolderOpen] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [, startMoveTransition] = useTransition();
    const router = useRouter();
    const markdownContainerRef = useRef<React.RefObject<HTMLElement | null> | null>(null);
    const headerCardRef = useRef<HTMLDivElement>(null);
    const { setTitle, setSubtitle, setIsVisible } = useStickyHeader();

    // Intersection Observer for sticky title
    useEffect(() => {
        setTitle(spec.name);
        setSubtitle(spec.file_name || null);

        const observer = new IntersectionObserver(
            ([entry]) => {
                // If it's not intersecting and the top is above viewport, we scrolled past it
                if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
                    setIsVisible(true);
                } else {
                    setIsVisible(false);
                }
            },
            {
                // Trigger when the very bottom of the card leaves the viewport (top: -64px for header offset if needed, but 0 is safe)
                rootMargin: '-64px 0px 0px 0px',
                threshold: 0,
            }
        );

        if (headerCardRef.current) {
            observer.observe(headerCardRef.current);
        }

        return () => {
            observer.disconnect();
            setIsVisible(false);
        };
    }, [spec.name, setTitle, setIsVisible]);

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

    const handleUnlink = async () => {
        if (!confirm('Are you sure you want to remove this linked specification? It will be removed from this project but the original specification will not be affected.')) {
            return;
        }

        try {
            setIsUnlinking(true);
            const result = await unlinkSpec(spec.id, org.slug, project.slug);

            if (result?.error) {
                console.error(result.error);
                alert(result.error);
                setIsUnlinking(false);
                setIsOptionsModalOpen(false);
            } else {
                // Success, wait for redirect or explicitly redirect
                router.push(`/${org.slug}/${project.slug}`);
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to unlink:', error);
            alert('Failed to remove link. Please try again.');
            setIsUnlinking(false);
            setIsOptionsModalOpen(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you absolutely sure you want to delete this specification?\n\nThis action cannot be undone. All content, revisions, and comments will be permanently lost.')) {
            return;
        }

        try {
            setIsDeleting(true);
            const result = await deleteSpec(spec.id, org.slug, project.slug);

            if (result?.error) {
                console.error(result.error);
                alert(result.error);
                setIsDeleting(false);
                setIsOptionsModalOpen(false);
            } else {
                router.push(`/${org.slug}/${project.slug}`);
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete specification. Please try again.');
            setIsDeleting(false);
            setIsOptionsModalOpen(false);
        }
    };

    const handleCopyMarkdown = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => {
                setIsCopied(false);
                setIsOptionsModalOpen(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy markdown. Please try again.');
        }
    };

    const isLinked = !!spec.source_spec_id;
    const isOwner = currentUser?.id === spec.owner?.id;
    const canEdit = !isPublicView && !spec.archived_at && !isLinked;

    // Calculate comment metrics for display
    const hasThreads = threads !== undefined;
    const activeUnresolved = hasThreads
        ? threads.filter(t => !t.resolved).length
        : unresolvedCount;
    const totalThreads = hasThreads ? threads.length : 0;
    const showUnresolved = activeUnresolved > 0;
    const showTotal = !showUnresolved && hasThreads && totalThreads > 0;

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

            {isLinked && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <svg
                        className="w-5 h-5 text-blue-600 dark:text-blue-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <div>
                        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                            This is a linked specification
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            This specification originates from another project. It is automatically synced and cannot be edited here.
                        </p>
                    </div>
                </div>
            )}

            {/* Minimal Top Bar */}
            <div ref={headerCardRef} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4 md:mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex-1 min-w-0 pr-3">
                    <h1 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white truncate">
                        {spec.name}
                    </h1>
                    {spec.file_name && (
                        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-mono">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            {spec.file_name}
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    {aiSummary && (
                        <button
                            onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                            className="p-2 sm:px-4 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 dark:text-slate-300 font-medium rounded-lg transition-colors text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="hidden sm:inline">{isSummaryOpen ? 'Hide Summary' : 'Summary'}</span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsTocOpen(!isTocOpen)}
                        className={`p-2 transition-colors rounded-lg ${isTocOpen ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-700/50'}`}
                        title={isTocOpen ? "Hide Table of Contents" : "Show Table of Contents"}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                    </button>
                    {canEdit && (
                        <Link
                            href={`/${org.slug}/${project.slug}/${spec.slug}/edit`}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors text-sm"
                        >
                            Edit
                        </Link>
                    )}
                    {frontmatter && (
                        <button
                            onClick={() => setIsInfoOpen(true)}
                            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                            title="View Frontmatter"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={() => setIsOptionsModalOpen(true)}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Options"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                    {(showUnresolved || showTotal) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsSidebarOpen(true);
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-colors ${showUnresolved
                                ? "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50 dark:hover:bg-orange-900/50"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="hidden sm:inline">{showUnresolved ? `${activeUnresolved} unresolved` : `${totalThreads} comments`}</span>
                        </button>
                    )}
                </div>
            </div>

            <div className={`flex items-start transition-all duration-300 relative justify-center ${isSidebarOpen && !isTocOpen ? 'lg:gap-2' : 'lg:gap-6'}`}>
                <div className="flex-1 min-w-0 relative w-full max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8 mb-12 bg-white dark:bg-slate-900/50 border-x sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl min-h-screen">
                    {/* Summary Section - shown only when toggled on */}
                    {aiSummary && isSummaryOpen && (
                        <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Summary of Changes
                            </h3>
                            <div className="prose prose-slate dark:prose-invert">
                                <MarkdownRenderer content={aiSummary} disableHeadingIds={true} />
                            </div>

                            {latestRevisionNumber > 1 && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                    <Link
                                        href={`/${org.slug}/${project.slug}/${spec.slug}/revisions/${latestRevisionNumber}/diff`}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                        Open Full Comparison
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content Section */}
                    {isShowingDiff && previousContent ? (
                        <div className="prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed">
                            <RenderedAstDiff
                                oldContent={previousContent}
                                newContent={content}
                                onCommentClick={handleCommentClick}
                                onHighlightClick={handleHighlightClick}
                                threads={threads}
                                containerRefCallback={handleContainerRef}
                            />
                        </div>
                    ) : (
                        <div className="prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed bg-transparent border-0">
                            <MarkdownRenderer
                                content={content}
                                onCommentClick={handleCommentClick}
                                onHighlightClick={handleHighlightClick}
                                threads={threads}
                                containerRefCallback={handleContainerRef}
                            />
                        </div>
                    )}

                    {/* Selection Popover - rendered relative to the content area */}
                    {markdownContainerRef.current && (
                        <SelectionPopover
                            containerRef={markdownContainerRef.current as React.RefObject<HTMLElement | null>}
                            onComment={handleTextSelect}
                            isReadOnly={isPublicView}
                        />
                    )}
                </div>

                {/* Table of Contents - Hidden on smaller screens, collapsible on xl */}
                <div className={`hidden xl:block flex-shrink-0 sticky top-24 self-start transition-all duration-300 ${isTocOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
                    <div className="relative">
                        <div className={`transition-opacity duration-300 pl-6 ${isTocOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <TableOfContents content={content} threads={threads} />
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

            {isMoveToFolderOpen && (
                <FolderPickerModal
                    folders={folders}
                    currentFolderId={spec.folder_id ?? null}
                    onConfirm={(folderId) => {
                        startMoveTransition(async () => {
                            await moveSpecsToFolder([spec.id], folderId, org.slug, project.slug);
                            setIsMoveToFolderOpen(false);
                            router.refresh();
                        });
                    }}
                    onClose={() => setIsMoveToFolderOpen(false)}
                    title="Move Spec to Folder…"
                />
            )}

            {/* Frontmatter Info Modal */}
            <Transition.Root show={isInfoOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={setIsInfoOpen}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                enterTo="opacity-100 translate-y-0 sm:scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            >
                                <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-2xl border border-slate-200 dark:border-slate-800">
                                    <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                                            Frontmatter Metadata
                                        </Dialog.Title>
                                        <button
                                            type="button"
                                            className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 focus:outline-none"
                                            onClick={() => setIsInfoOpen(false)}
                                        >
                                            <span className="sr-only">Close</span>
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50">
                                        <pre className="p-6 font-mono text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                                            {frontmatter}
                                        </pre>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>

            <SpecOptionsModal
                isOpen={isOptionsModalOpen}
                onClose={() => setIsOptionsModalOpen(false)}
                spec={spec}
                orgSlug={org.slug}
                projectSlug={project.slug}
                revisionCount={revisionCount}
                isOwner={isOwner === true}
                isPublicView={isPublicView}
                isLinked={isLinked}
                foldersLength={folders.length}
                isSharing={isSharing}
                onTogglePublic={handleTogglePublic}
                onMoveToFolder={() => setIsMoveToFolderOpen(true)}
                onDuplicate={() => setIsCopyModalOpen(true)}
                isGeneratingPdf={isGeneratingPdf}
                onExportPdf={handleExportPdf}
                isCopied={isCopied}
                onCopyMarkdown={handleCopyMarkdown}
                isUnlinking={isUnlinking}
                onUnlink={handleUnlink}
                isDeleting={isDeleting}
                onDelete={handleDelete}
            />
        </div>
    );
}
