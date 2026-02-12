
import { useState } from 'react';
import { Comment, Profile } from '@/lib/types';
import { MarkdownRenderer } from '@/components/spec/MarkdownRenderer';
import { CommentInput } from './CommentInput';

interface CommentItemProps {
    comment: Comment;
    currentUser: Profile | null;
    onEdit: (id: string, newBody: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    orgSlug: string;
}

export function CommentItem({
    comment,
    currentUser,
    onEdit,
    onDelete,
    orgSlug,
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
        return null;
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
                            onSubmit={async (content, _mentions) => {
                                await onEdit(comment.id, content);
                                setIsEditing(false);
                            }}
                            className="mb-2"
                            autoFocus
                            orgSlug={orgSlug}
                            currentUser={currentUser}
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
                        <MarkdownRenderer
                            content={(() => {
                                let processedBody = comment.body;
                                if (comment.mentions && comment.mentions.length > 0) {
                                    // sort by name length desc to avoid partial matches
                                    const sortedMentions = [...comment.mentions].sort((a, b) => {
                                        const nameA = a.mentioned_user?.full_name || '';
                                        const nameB = b.mentioned_user?.full_name || '';
                                        return nameB.length - nameA.length;
                                    });

                                    sortedMentions.forEach(mention => {
                                        const name = mention.mentioned_user?.full_name;
                                        if (name) {
                                            // Replace @Name with markdown link with mention-link class
                                            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            // Match @Name followed by space or end of string
                                            const regex = new RegExp(`@${escapedName}(?=\\s|$)`, 'g');
                                            processedBody = processedBody.replace(regex, `<a href="mention:${mention.mentioned_user_id}" class="mention-link">@${name}</a>`);
                                        }
                                    });
                                }
                                return processedBody;
                            })()}
                            className="[&>p]:mb-2 [&>p:last-child]:mb-0 text-sm"
                            disableHeadingIds={true}
                        />
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
