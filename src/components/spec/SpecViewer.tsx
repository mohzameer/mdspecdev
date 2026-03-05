'use client';

import { useState, useRef, useCallback, useEffect, useTransition, useMemo } from 'react';
import { computePositionalDiffs } from '@/lib/diff-utils';
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
    const [isTocOpen, setIsTocOpen] = useState(true);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
    const [activeQuotedText, setActiveQuotedText] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [isMoveToFolderOpen, setIsMoveToFolderOpen] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
    const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [showFrontmatter, setShowFrontmatter] = useState(false);
    const [, startMoveTransition] = useTransition();
    const router = useRouter();
    const markdownContainerRef = useRef<React.RefObject<HTMLElement | null> | null>(null);
    const shareMenuRef = useRef<HTMLDivElement>(null);
    const overflowMenuRef = useRef<HTMLDivElement>(null);
    const infoRef = useRef<HTMLDivElement>(null);
    const headerCardRef = useRef<HTMLDivElement>(null);
    const { setTitle, setIsVisible } = useStickyHeader();

    // Intersection Observer for sticky title
    useEffect(() => {
        setTitle(spec.name);

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

    // Close share menu, overflow menu, and info popover when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
                setIsShareMenuOpen(false);
            }
            if (overflowMenuRef.current && !overflowMenuRef.current.contains(event.target as Node)) {
                setIsOverflowMenuOpen(false);
            }
            if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
                setIsInfoOpen(false);
            }
        }

        if (isShareMenuOpen || isOverflowMenuOpen || isInfoOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isShareMenuOpen, isOverflowMenuOpen, isInfoOpen]);

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
                setIsOverflowMenuOpen(false);
            } else {
                // Success, wait for redirect or explicitly redirect
                router.push(`/${org.slug}/${project.slug}`);
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to unlink:', error);
            alert('Failed to remove link. Please try again.');
            setIsUnlinking(false);
            setIsOverflowMenuOpen(false);
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
                setIsOverflowMenuOpen(false);
            } else {
                router.push(`/${org.slug}/${project.slug}`);
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete specification. Please try again.');
            setIsDeleting(false);
            setIsOverflowMenuOpen(false);
        }
    };

    const handleCopyMarkdown = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => {
                setIsCopied(false);
                setIsOverflowMenuOpen(false);
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

            {/* Header Section — Collapsible */}
            <div ref={headerCardRef} className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 shadow-sm">
                {/* Always-visible row: title, badges, Edit + "..." */}
                <div className="flex items-start justify-between p-6 gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                    <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                    >
                        <div className="flex flex-col gap-1 mb-2">
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white truncate">
                                    {spec.name}
                                </h1>
                            </div>
                            {spec.file_name && (
                                <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                                    {spec.file_name}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={spec.status} />
                            <MaturityBadge maturity={spec.maturity} />
                            <TagsList tags={spec.tags} max={5} />

                            {/* Frontmatter Info Popover */}
                            <div className="relative flex items-center" ref={infoRef}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsInfoOpen(!isInfoOpen);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                                    title="View supported frontmatter"
                                    aria-label="Supported frontmatter formatting"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>

                                {isInfoOpen && (
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden transform origin-top-left animate-in fade-in slide-in-from-top-2 text-left"
                                    >
                                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80">
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                </svg>
                                                Supported Frontmatter
                                            </h4>
                                        </div>
                                        <div className="p-4 bg-slate-50/50 dark:bg-transparent">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                                                When updating via the API or editing content, you can use YAML frontmatter to automatically update this document's metadata.
                                                If you use frontmatter to define a field, it will overwrite the metadata configured in the UI interface.
                                            </p>
                                            <div className="rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 shadow-inner">
                                                <pre className="text-xs font-mono text-emerald-400 p-3 overflow-x-auto whitespace-pre">
                                                    <span className="text-slate-500">---</span>{'\n'}
                                                    <span className="text-blue-300">status:</span> planned | in-progress |{'\n'}        completed{'\n'}
                                                    <span className="text-blue-300">maturity:</span> draft | review |{'\n'}          stable | deprecated{'\n'}
                                                    <span className="text-blue-300">progress:</span> 0-100{'\n'}
                                                    <span className="text-blue-300">tags:</span> ["api", "backend"]{'\n'}
                                                    <span className="text-slate-500">---</span>
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(showUnresolved || showTotal) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsSidebarOpen(true);
                                    }}
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 transition-colors ${showUnresolved
                                        ? "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50 dark:hover:bg-orange-900/50"
                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700"
                                        }`}
                                >
                                    💬 {showUnresolved ? `${activeUnresolved} unresolved` : `${totalThreads} comments`}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        {/* Overflow "..." menu */}
                        <div className="relative" ref={overflowMenuRef}>
                            <button
                                onClick={() => setIsOverflowMenuOpen(!isOverflowMenuOpen)}
                                className="px-3 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white font-medium rounded-lg transition-colors text-sm"
                                title="More actions"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
                                </svg>
                            </button>

                            {isOverflowMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                                    {/* Share / Public toggle — owner only */}
                                    {isOwner && !isPublicView && (
                                        <div ref={shareMenuRef}>
                                            <button
                                                onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                </svg>
                                                Share ({spec.is_public ? 'Public' : 'Private'})
                                            </button>
                                            {isShareMenuOpen && (
                                                <div className="border-t border-b border-slate-100 dark:border-slate-700/50 py-1 my-1 bg-slate-50/50 dark:bg-slate-900/30">
                                                    <div className="px-4 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                        Currently: <span className={spec.is_public ? "text-green-600 dark:text-green-400" : "text-slate-700 dark:text-slate-300"}>{spec.is_public ? 'Public' : 'Private'}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            handleTogglePublic();
                                                            setIsShareMenuOpen(false);
                                                            setIsOverflowMenuOpen(false);
                                                        }}
                                                        disabled={isSharing}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center gap-2"
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
                                                    <div className="px-4 py-1.5 text-xs text-slate-400">
                                                        {spec.is_public
                                                            ? 'Anyone with the link can view.'
                                                            : 'Only organization members can view.'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Move to Folder — non-public, non-linked */}
                                    {!isPublicView && !isLinked && folders.length >= 0 && (
                                        <button
                                            onClick={() => {
                                                setIsMoveToFolderOpen(true);
                                                setIsOverflowMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                        >
                                            <span>📁</span>
                                            Move to Folder…
                                        </button>
                                    )}

                                    {/* Duplicate — non-public view only */}
                                    {!isPublicView && (
                                        <button
                                            onClick={() => {
                                                setIsCopyModalOpen(true);
                                                setIsOverflowMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Duplicate
                                        </button>
                                    )}

                                    {/* Export PDF */}
                                    <button
                                        onClick={() => {
                                            handleExportPdf();
                                            setIsOverflowMenuOpen(false);
                                        }}
                                        disabled={isGeneratingPdf}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                    >
                                        {isGeneratingPdf ? (
                                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        )}
                                        Export PDF
                                    </button>

                                    {/* Copy Markdown */}
                                    <button
                                        onClick={handleCopyMarkdown}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                    >
                                        {isCopied ? (
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                        {isCopied ? 'Copied!' : 'Copy Markdown'}
                                    </button>

                                    {/* Unlink - Only for linked specs and non-public view */}
                                    {isLinked && !isPublicView && (
                                        <div className="border-t border-slate-100 dark:border-slate-700/50 my-1">
                                            <button
                                                onClick={handleUnlink}
                                                disabled={isUnlinking}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                            >
                                                {isUnlinking ? (
                                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                    </svg>
                                                )}
                                                Remove Link
                                            </button>
                                        </div>
                                    )}

                                    {/* Delete - Only for owners and non-linked specs */}
                                    {isOwner && !isLinked && !isPublicView && (
                                        <div className="border-t border-slate-100 dark:border-slate-700/50 my-1">
                                            <button
                                                onClick={handleDelete}
                                                disabled={isDeleting}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                            >
                                                {isDeleting ? (
                                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                )}
                                                Delete Specification
                                            </button>
                                        </div>
                                    )}

                                    {/* History */}
                                    <Link
                                        href={`/${org.slug}/${project.slug}/${spec.slug}/revisions`}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                        onClick={() => setIsOverflowMenuOpen(false)}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        History ({revisionCount})
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Edit — always visible */}
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

                {/* Expandable detail area */}
                {isHeaderExpanded && (
                    <div className="px-6 pb-6 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                        {spec.progress !== null && (
                            <div className="mb-4">
                                <ProgressBar progress={spec.progress} showLabel={false} />
                            </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                            <span>
                                By @{spec.owner?.full_name || 'Unknown'}
                            </span>
                            <span>·</span>
                            <span>
                                Updated {formatRelativeTime(spec.updated_at)}
                            </span>
                            <span>·</span>
                            <span>
                                Created {formatDate(spec.created_at)}
                            </span>
                            <span>·</span>
                            <span>
                                {revisionCount} {revisionCount === 1 ? 'revision' : 'revisions'}
                            </span>
                        </div>

                        {frontmatter && (
                            <div className="mt-6 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-black/20">
                                <div
                                    className="flex items-center justify-between p-3 cursor-pointer select-none"
                                    onClick={() => setShowFrontmatter(!showFrontmatter)}
                                >
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                                        Frontmatter Metadata
                                        <svg
                                            className={`w-4 h-4 transition-transform duration-200 ${showFrontmatter ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </span>
                                </div>
                                {showFrontmatter && (
                                    <pre className="p-4 bg-white/50 dark:bg-black/40 border-t border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto">
                                        {frontmatter}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                )}
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

            <div className={`flex items-start transition-all duration-300 relative ${isSidebarOpen && !isTocOpen ? 'lg:gap-2' : 'lg:gap-6'}`}>
                <div className="flex-1 min-w-0 relative w-full lg:w-auto">
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
        </div>
    );
}
