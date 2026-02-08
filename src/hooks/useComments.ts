
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CommentThread } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

const fetchComments = async (specId: string): Promise<CommentThread[]> => {
    const res = await fetch(`/api/comments?specId=${specId}`);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch comments');
    }
    return res.json();
};

export function useComments(specId: string) {
    const queryClient = useQueryClient();

    // Query: Fetch all threads for a spec
    const { data: threads, isLoading, error } = useQuery({
        queryKey: ['comments', specId],
        queryFn: () => fetchComments(specId),
        enabled: !!specId,
    });

    // Mutation: Create a new thread or reply
    const createCommentMutation = useMutation({
        mutationFn: async ({
            spec_id,
            anchor_heading_id,
            body,
            thread_id
        }: {
            spec_id?: string,
            anchor_heading_id?: string,
            body: string,
            thread_id?: string
        }) => {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spec_id, anchor_heading_id, body, thread_id }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create comment');
            }
            return res.json();
        },
        onSuccess: (updatedThread) => {
            queryClient.setQueryData(['comments', specId], (oldThreads: CommentThread[] | undefined) => {
                if (!oldThreads) return [updatedThread];

                // Check if thread already exists in list (it means we added a reply)
                const existingThreadIndex = oldThreads.findIndex(t => t.id === updatedThread.id);

                if (existingThreadIndex >= 0) {
                    // Update existing thread
                    const newThreads = [...oldThreads];
                    newThreads[existingThreadIndex] = updatedThread;
                    return newThreads;
                } else {
                    // Add new thread
                    return [...oldThreads, updatedThread];
                }
            });
        },
    });

    // Mutation: Resolve/Unresolve thread
    const resolveThreadMutation = useMutation({
        mutationFn: async ({ thread_id, resolved }: { thread_id: string, resolved: boolean }) => {
            const res = await fetch('/api/comments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: thread_id, type: 'resolve_thread', value: resolved }),
            });
            if (!res.ok) throw new Error('Failed to update thread status');
            return res.json();
        },
        onSuccess: (updatedThread) => {
            queryClient.setQueryData(['comments', specId], (oldThreads: CommentThread[] | undefined) => {
                if (!oldThreads) return [updatedThread];
                return oldThreads.map(t => t.id === updatedThread.id ? { ...t, ...updatedThread } : t);
            });
        },
    });

    // Mutation: Edit comment
    const editCommentMutation = useMutation({
        mutationFn: async ({ comment_id, body }: { comment_id: string, body: string }) => {
            const res = await fetch('/api/comments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: comment_id, type: 'edit_comment', value: body }),
            });
            if (!res.ok) throw new Error('Failed to edit comment');
            return res.json();
        },
        onSuccess: () => {
            // Invalidate to refetch fresh data (simplest way to update nested comment)
            // Or manually update cache if improved performance needed
            queryClient.invalidateQueries({ queryKey: ['comments', specId] });
        }
    });

    // Mutation: Delete comment
    const deleteCommentMutation = useMutation({
        mutationFn: async (comment_id: string) => {
            const res = await fetch(`/api/comments?id=${comment_id}`, {
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
        createComment: createCommentMutation.mutateAsync,
        resolveThread: resolveThreadMutation.mutateAsync,
        editComment: editCommentMutation.mutateAsync,
        deleteComment: deleteCommentMutation.mutateAsync,
    };
}
