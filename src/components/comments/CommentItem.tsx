
import { useState } from 'react';
import { Comment, Profile } from '@/lib/types';
import { MarkdownRenderer } from '@/components/spec/MarkdownRenderer';
import { CommentInput } from './CommentInput';

interface CommentItemProps {
    comment: Comment;
    currentUser: Profile | null;
    onEdit: (id: string, newBody: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export function CommentItem({
    comment,
    currentUser,
    onEdit,
    onDelete,
}: CommentItemProps) {
    const [isEditing, setIsEditing] = useState(false);

    const isOwner = currentUser?.id === comment.author_id;
    const authorName = comment.author?.full_name || comment.author?.email || 'Unknown User';
    const authorAvatar = comment.author?.avatar_url;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        });
    };

    if (comment.deleted) {
        return (
            <div className="py-2 text-sm italic text-slate-500 dark:text-slate-400">
                This comment has been deleted.
            </div>
        );
    }

    return (
        <div className="flex gap-3 py-3 group">
            <div className="flex-shrink-0">
                {authorAvatar ? (
                    <img
                        src={authorAvatar}
                        alt={authorName}
                        className="w-8 h-8 rounded-full"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300">
                        {authorName.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {authorName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(comment.created_at)}
                    </span>
                </div>

                {isEditing ? (
                    <div className="mt-2">
                        <CommentInput
                            onSubmit={async (content) => {
                                await onEdit(comment.id, content);
                                setIsEditing(false);
                            }}
                            className="mb-2"
                            autoFocus
                        />
                        <button
                            onClick={() => setIsEditing(false)}
                            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                        <MarkdownRenderer content={comment.body} className="[&>p]:mb-2 [&>p:last-child]:mb-0 text-sm" disableHeadingIds={true} />
                    </div>
                )}

                {/* Actions */}
                {!isEditing && isOwner && (
                    <div className="flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this comment?')) {
                                    onDelete(comment.id);
                                }
                            }}
                            className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 font-medium"
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
