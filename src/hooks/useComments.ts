
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CommentThread } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface UseCommentsResult {
    threads: CommentThread[] | undefined;
    isLoading: boolean;
    error: Error | null;
    createComment: (anchorHeadingId: string, content: string, mentions?: string[]) => Promise<void>;
    addReply: (threadId: string, content: string, mentions?: string[]) => Promise<void>;
    resolveThread: (threadId: string, resolved: boolean) => Promise<void>;
    editComment: (commentId: string, content: string) => Promise<void>;
    deleteComment: (commentId: string) => Promise<void>;
}

export function useComments(specId: string): UseCommentsResult {
    const queryClient = useQueryClient();
    const supabase = createClient();

    // Query: Fetch all threads for a spec
    const { data: threads, isLoading, error } = useQuery({
        queryKey: ['comments', specId],
        queryFn: async () => {
            const res = await fetch(`/api/comments?specId=${specId}`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch comments');
            }
            return res.json() as Promise<CommentThread[]>;
        },
        enabled: !!specId,
    });

    // Mutation: Create a new thread
    const createCommentMutation = useMutation({
        mutationFn: async ({ anchorHeadingId, content, mentions }: { anchorHeadingId: string, content: string, mentions?: string[] }) => {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    specId,
                    anchorHeadingId,
                    body: content,
                    mentions,
                }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create comment');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', specId] });
        },
    });

    // Mutation: Add reply to thread
    const replyMutation = useMutation({
        mutationFn: async ({ threadId, content, mentions }: { threadId: string, content: string, mentions?: string[] }) => {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    specId,
                    threadId,
                    body: content,
                    mentions,
                }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to add reply');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', specId] });
        },
    });

    // Mutation: Resolve/Unresolve thread
    const resolveThreadMutation = useMutation({
        mutationFn: async ({ threadId, resolved }: { threadId: string, resolved: boolean }) => {
            const res = await fetch('/api/comments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: threadId,
                    type: 'resolve_thread',
                    value: resolved
                }),
            });
            if (!res.ok) throw new Error('Failed to update thread status');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', specId] });
        },
    });

    // Mutation: Edit comment
    const editCommentMutation = useMutation({
        mutationFn: async ({ commentId, content }: { commentId: string, content: string }) => {
            const res = await fetch('/api/comments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: commentId,
                    type: 'edit_comment',
                    value: content
                }),
            });
            if (!res.ok) throw new Error('Failed to edit comment');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', specId] });
        }
    });

    // Mutation: Delete comment
    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: string) => {
            const res = await fetch(`/api/comments?id=${commentId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete comment');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', specId] });
        }
    });

    return {
        threads,
        isLoading,
        error,
        createComment: async (anchorHeadingId: string, content: string, mentions?: string[]) => {
            await createCommentMutation.mutateAsync({ anchorHeadingId, content, mentions });
        },
        addReply: async (threadId: string, content: string, mentions?: string[]) => {
            await replyMutation.mutateAsync({ threadId, content, mentions });
        },
        resolveThread: async (threadId: string, resolved: boolean) => {
            await resolveThreadMutation.mutateAsync({ threadId, resolved });
        },
        editComment: async (commentId: string, content: string) => {
            await editCommentMutation.mutateAsync({ commentId, content });
        },
        deleteComment: async (commentId: string) => {
            await deleteCommentMutation.mutateAsync(commentId);
        },
    };
}
