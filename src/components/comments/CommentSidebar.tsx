
import { useRef, useEffect } from 'react';
import { useComments } from '@/hooks/useComments';
import { Profile } from '@/lib/types';
import { CommentThread } from './CommentThread';
import { CommentInput } from './CommentInput';

interface CommentSidebarProps {
    specId: string;
    currentUser: Profile | null;
    isOpen: boolean;
    onClose: () => void;
    activeHeadingId?: string | null;
    activeQuotedText?: string | null;
    orgSlug: string;
    isReadOnly?: boolean;
    canResolve?: boolean;
}

export function CommentSidebar({
    specId,
    currentUser,
    isOpen,
    onClose,
    activeHeadingId,
    activeQuotedText,
    orgSlug,
    isReadOnly = false,
    canResolve = !isReadOnly,
}: CommentSidebarProps) {
    const {
        threads,
        isLoading,
        createComment,
        addReply,
        resolveThread,
        editComment,
        deleteComment
    } = useComments(specId);

    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // ... (existing code)
    }, [activeHeadingId, threads]);

    if (!isOpen) return null;

    const existingThread = activeHeadingId && !activeQuotedText
        ? threads?.find(t => t.anchor_heading_id === activeHeadingId && !t.quoted_text)
        : null;

    // Check if there's an existing thread for this exact quoted text
    const existingQuotedThread = activeQuotedText
        ? threads?.find(t => t.quoted_text === activeQuotedText)
        : null;

    const showNewCommentInput = !isReadOnly && activeHeadingId && !existingThread && !existingQuotedThread;

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                onClick={onClose}
            />

            <div
                ref={sidebarRef}
                className={`
                    fixed inset-y-0 right-0 z-50 w-[90vw] sm:w-96 h-screen bg-white dark:bg-slate-900 flex flex-col shadow-2xl rounded-l-2xl border-l border-slate-200 dark:border-slate-800
                    lg:static lg:h-[calc(100vh-8rem)] lg:rounded-l-none lg:rounded-r-xl lg:sticky lg:top-24 lg:shadow-sm lg:ml-4
                    transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                `}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Comments</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {showNewCommentInput && (
                        <div className="mb-6">
                            {activeQuotedText ? (
                                <div className="mb-3">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                                        Commenting on selected text
                                    </p>
                                    <blockquote className="text-sm text-slate-700 dark:text-slate-300 border-l-2 border-blue-400 pl-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-r italic line-clamp-4">
                                        &ldquo;{activeQuotedText}&rdquo;
                                    </blockquote>
                                </div>
                            ) : (
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 px-1">
                                    Start a discussion on &quot;{activeHeadingId}&quot;
                                </p>
                            )}
                            <CommentInput
                                onSubmit={async (content, mentions) => {
                                    await createComment(activeHeadingId!, content, mentions, activeQuotedText || undefined);
                                }}
                                autoFocus
                                placeholder="Write a comment..."
                                orgSlug={orgSlug}
                                currentUser={currentUser}
                            />
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : threads?.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <p>No comments yet.</p>
                            {!isReadOnly && (
                                <p className="text-sm mt-2">Select text or a section heading to start a discussion.</p>
                            )}
                        </div>
                    ) : (
                        (() => {
                            // Filter out threads with no visible (non-deleted) comments
                            const visibleThreads = threads?.filter(t =>
                                t.comments && t.comments.some(c => !c.deleted)
                            ) || [];

                            // Sort threads to bring active thread to top
                            const sortedThreads = [...visibleThreads];
                            if (activeHeadingId && sortedThreads.length > 0) {
                                const activeIndex = sortedThreads.findIndex(t => t.anchor_heading_id === activeHeadingId);
                                if (activeIndex > 0) {
                                    const [activeThread] = sortedThreads.splice(activeIndex, 1);
                                    sortedThreads.unshift(activeThread);
                                }
                            }
                            return sortedThreads;
                        })()?.map(thread => (
                            <div key={thread.id} id={`thread-${thread.anchor_heading_id}`}>
                                <div className="mb-1 flex flex-wrap items-center gap-1">
                                    <button
                                        onClick={() => {
                                            const el = document.getElementById(thread.anchor_heading_id);
                                            if (el) {
                                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                el.classList.add('bg-yellow-100', 'dark:bg-yellow-900/30');
                                                setTimeout(() => {
                                                    el.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/30');
                                                }, 2000);
                                            }
                                        }}
                                        className="text-xs font-mono text-slate-500 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                        title="Scroll to section"
                                    >
                                        #{thread.anchor_heading_id}
                                    </button>
                                </div>
                                <CommentThread
                                    thread={thread}
                                    currentUser={currentUser}
                                    orgSlug={orgSlug}
                                    quotedText={thread.quoted_text}
                                    isReadOnly={isReadOnly}
                                    canResolve={canResolve}
                                    onAddReply={async (threadId, content, mentions) => {
                                        await addReply(threadId, content, mentions);
                                    }}
                                    onResolve={async (threadId, resolved) => {
                                        await resolveThread(threadId, resolved);
                                    }}
                                    onEditComment={async (commentId, content) => {
                                        await editComment(commentId, content);
                                    }}
                                    onDeleteComment={async (commentId) => {
                                        await deleteComment(commentId);
                                    }}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
