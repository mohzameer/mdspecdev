
import { useState } from 'react';
import { CommentThread as CommentThreadType, Profile } from '@/lib/types';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';

interface CommentThreadProps {
    thread: CommentThreadType;
    currentUser: Profile | null;
    onAddReply: (threadId: string, content: string, mentions?: string[]) => Promise<void>;
    onResolve: (threadId: string, resolved: boolean) => Promise<void>;
    onEditComment: (commentId: string, content: string) => Promise<void>;
    onDeleteComment: (commentId: string) => Promise<void>;
    orgSlug: string;
    quotedText?: string | null;
    isReadOnly?: boolean;
    canResolve?: boolean;
}

export function CommentThread({
    thread,
    currentUser,
    onAddReply,
    onResolve,
    onEditComment,
    onDeleteComment,
    orgSlug,
    quotedText,
    isReadOnly = false,
    canResolve = !isReadOnly,
}: CommentThreadProps) {
    const [isReplying, setIsReplying] = useState(false);

    const comments = thread.comments || [];
    const isResolved = thread.resolved;

    const rootComment = comments[0];
    const isThreadAuthor = currentUser && rootComment && currentUser.id === rootComment.author_id;
    const showResolveButton = !isReadOnly && (canResolve || isThreadAuthor);

    return (
        <div className={`border rounded-lg mb-3 bg-white dark:bg-slate-900 ${isResolved ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
                <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {isResolved ? 'Resolved' : 'Active Thread'}
                    </span>
                    {showResolveButton && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onResolve(thread.id, !isResolved)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${isResolved ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300'}`}
                            >
                                {isResolved ? 'Reopen' : 'Resolve'}
                            </button>
                        </div>
                    )}
                </div>
                {quotedText && (
                    <div className="px-3 pb-2">
                        <blockquote className="text-xs text-slate-600 dark:text-slate-400 border-l-2 border-amber-400 pl-2 py-0.5 italic line-clamp-3 bg-white dark:bg-slate-900/50 rounded-r">
                            &ldquo;{quotedText}&rdquo;
                        </blockquote>
                    </div>
                )}
            </div>

            <div className="p-3 space-y-2">
                {comments.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No comments yet.</p>
                ) : (
                    comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            currentUser={currentUser}
                            onEdit={onEditComment}
                            onDelete={onDeleteComment}
                            orgSlug={orgSlug}
                        />
                    ))
                )}

                {!isReadOnly && (
                    isReplying ? (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <CommentInput
                                onSubmit={async (content, mentions) => {
                                    await onAddReply(thread.id, content, mentions);
                                    setIsReplying(false);
                                }}
                                autoFocus
                                placeholder="Reply to thread..."
                                orgSlug={orgSlug}
                                currentUser={currentUser}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    onClick={() => setIsReplying(false)}
                                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsReplying(true)}
                            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                            Reply
                        </button>
                    )
                )}
            </div>
        </div>
    );
}
