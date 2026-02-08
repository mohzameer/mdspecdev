
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
    orgSlug: string;
}

export function CommentSidebar({
    specId,
    currentUser,
    isOpen,
    onClose,
    activeHeadingId,
    orgSlug,
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

    // Filter threads if activeHeadingId is set? 
    // Filter threads if activeHeadingId is set?
    // For now, let's show all, but scroll to active one or highlight it.
    // Actually, let's filter if provided, or show all if not?
    // Plan says "Displays threads relevant to the visible viewport or all threads".
    // Let's stick to showing all for now, maybe highlight.

    useEffect(() => {
        // If activeHeadingId changes, scroll that thread into view
        if (activeHeadingId && threads) {
            const threadElement = document.getElementById(`thread-${activeHeadingId}`);
            if (threadElement) {
                threadElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Maybe add a highlight class temporarily
            }
        }
    }, [activeHeadingId, threads]);

    if (!isOpen) return null;

    const existingThread = activeHeadingId ? threads?.find(t => t.anchor_heading_id === activeHeadingId) : null;

    return (
        <div
            ref={sidebarRef}
            className="w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sticky top-24 h-[calc(100vh-8rem)] rounded-r-xl ml-4 shadow-sm"
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
                {activeHeadingId && !existingThread && (
                    <div className="mb-6">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2 px-1">
                            Start a discussion on "{activeHeadingId}"
                        </p>
                        <CommentInput
                            onSubmit={async (content, mentions) => {
                                await createComment(activeHeadingId, content, mentions);
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
                        <p className="text-sm mt-2">Select a section to start a discussion.</p>
                    </div>
                ) : (
                    (() => {
                        // Sort threads to bring active thread to top
                        const sortedThreads = threads ? [...threads] : [];
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
                            <div className="mb-1">
                                <button
                                    onClick={() => {
                                        const el = document.getElementById(thread.anchor_heading_id);
                                        if (el) {
                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            // Optional: highlight text temporarily
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
    );
}
