
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const specId = searchParams.get('specId');

    if (!specId) {
        return NextResponse.json({ error: 'Spec ID is required' }, { status: 400 });
    }

    try {
        const { data: threads, error } = await supabase
            .from('comment_threads')
            .select(`
        *,
        resolver:resolved_by (
          id,
          full_name,
          avatar_url
        ),
        comments (
          *,
          author:author_id (
            id,
            full_name,
            avatar_url
          )
        )
      `)
            .eq('spec_id', specId)
            .order('created_at', { ascending: true }); // Threads by creation time

        if (error) throw error;

        // Sort comments within threads by creation time
        const threadsWithSortedComments = threads?.map((thread: any) => ({
            ...thread,
            comments: thread.comments.sort((a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
        })) || [];

        return NextResponse.json(threadsWithSortedComments);
    } catch (error: any) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { specId, threadId, body, anchorHeadingId, parentCommentId, content, mentions } = await req.json();

        // Normalize body vs content (CommentInput might send content)
        const commentBody = body || content;

        if (!commentBody) {
            return NextResponse.json({ error: 'Body is required' }, { status: 400 });
        }

        // If threadID is provided, it's a reply
        if (threadId) {
            const { data: comment, error } = await supabase
                .from('comments')
                .insert({
                    thread_id: threadId,
                    author_id: user.id,
                    parent_comment_id: parentCommentId,
                    body: commentBody,
                })
                .select('*, author:profiles(*)')
                .single();

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

            // Handle mentions
            if (mentions && Array.isArray(mentions) && mentions.length > 0) {
                const mentionInserts = mentions.map((userId: string) => ({
                    comment_id: comment.id,
                    mentioned_user_id: userId,
                }));
                await supabase.from('mentions').insert(mentionInserts);
            }

            return NextResponse.json(comment);
        }

        // Otherwise create new thread
        if (!specId || !anchorHeadingId) {
            return NextResponse.json({ error: 'Spec ID and Anchor Heading ID required for new thread' }, { status: 400 });
        }

        // Create thread
        const { data: thread, error: threadError } = await supabase
            .from('comment_threads')
            .insert({
                spec_id: specId,
                anchor_heading_id: anchorHeadingId,
            })
            .select()
            .single();

        if (threadError) return NextResponse.json({ error: threadError.message }, { status: 500 });

        // Create first comment
        const { data: comment, error: commentError } = await supabase
            .from('comments')
            .insert({
                thread_id: thread.id,
                author_id: user.id,
                body: commentBody,
            })
            .select('*, author:profiles(*)')
            .single();

        if (commentError) throw commentError;

        // Handle mentions for new thread
        if (mentions && Array.isArray(mentions) && mentions.length > 0) {
            const mentionInserts = mentions.map((userId: string) => ({
                comment_id: comment.id,
                mentioned_user_id: userId,
            }));
            await supabase.from('mentions').insert(mentionInserts);
        }

        // Fetch the updated thread to return (so UI can update full state)
        const { data: updatedThread, error: fetchError } = await supabase
            .from('comment_threads')
            .select(`
                *,
                resolver:resolved_by (
                  id,
                  full_name,
                  avatar_url
                ),
                comments (
                  *,
                  author:author_id (
                    id,
                    full_name,
                    avatar_url
                  )
                )
              `)
            .eq('id', thread.id)
            .single();

        if (fetchError) throw fetchError;

        // Sort comments before returning
        if (updatedThread?.comments) {
            updatedThread.comments.sort((a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
        }

        return NextResponse.json(updatedThread);

    } catch (error: any) {
        console.error('Error creating comment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, type, value } = body;
        // type: 'resolve_thread' | 'edit_comment'

        if (type === 'resolve_thread') {
            const { data, error } = await supabase
                .from('comment_threads')
                .update({
                    resolved: value,
                    resolved_by: value ? user.id : null,
                    resolved_at: value ? new Date().toISOString() : null
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json(data);
        } else if (type === 'edit_comment') {
            // Ensure user owns the comment
            const { data: comment, error: fetchError } = await supabase
                .from('comments')
                .select('author_id')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;
            if (comment.author_id !== user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const { data, error } = await supabase
                .from('comments')
                .update({ body: value, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    } catch (error: any) {
        console.error('Error updating comment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check ownership
        const { data: comment, error: fetchError } = await supabase
            .from('comments')
            .select('author_id')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (comment.author_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Soft delete or Hard delete? Schema says 'deleted' boolean column exists.
        // Let's check schema/types again. Yes, 'deleted' boolean in schema (from implementation plan description).
        // Let's use soft delete.

        const { error } = await supabase
            .from('comments')
            .update({ deleted: true })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error deleting comment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
