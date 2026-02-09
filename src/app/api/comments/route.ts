
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

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

        // Fetch all mentions for comments in these threads
        const commentIds = threads?.flatMap(t => t.comments?.map((c: any) => c.id) || []) || [];

        let mentionsMap: Record<string, any[]> = {};
        if (commentIds.length > 0) {
            const serviceClient = createServiceRoleClient();
            const { data: mentions } = await serviceClient
                .from('mentions')
                .select(`
                    id,
                    comment_id,
                    mentioned_user_id,
                    mentioned_user:profiles!mentioned_user_id (
                        id,
                        full_name,
                        email
                    )
                `)
                .in('comment_id', commentIds);

            // Group mentions by comment_id
            if (mentions) {
                mentionsMap = mentions.reduce((acc: Record<string, any[]>, mention: any) => {
                    if (!acc[mention.comment_id]) {
                        acc[mention.comment_id] = [];
                    }
                    acc[mention.comment_id].push(mention);
                    return acc;
                }, {});
            }
        }

        // Sort comments within threads by creation time and add mentions
        const threadsWithSortedComments = threads?.map((thread: any) => ({
            ...thread,
            comments: thread.comments.sort((a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ).map((comment: any) => ({
                ...comment,
                mentions: mentionsMap[comment.id] || []
            }))
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
                const serviceClient = createServiceRoleClient();
                await serviceClient.from('mentions').insert(mentionInserts);
            }

            // Send notifications (Fire and forget, or await?)
            // We await to ensure errors are logged, but maybe we shouldn't block response too long?
            // For now, let's await to be safe and ensure it works.
            await sendCommentNotifications(specId, threadId, commentBody, mentions, user);

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
            const serviceClient = createServiceRoleClient();
            await serviceClient.from('mentions').insert(mentionInserts);
        }

        // ... (existing code) ...

        // Fetch the updated thread to return (so UI can update full state)
        const { data: updatedThread, error: fetchError } = await supabase
            .from('comment_threads')
            .select(`
                *,
                spec:specs (
                    id,
                    name,
                    slug,
                    project:projects (
                        slug,
                        organization:organizations (
                            slug
                        )
                    )
                ),
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
                        avatar_url,
                        email
                    )
                )
            `)
            .eq('id', thread.id)
            .single();

        if (fetchError) throw fetchError;

        // --- Email Notifications ---
        try {
            console.log('--- Email Debugging Start (Restored) ---');
            console.log('Mentions received:', mentions);

            // 1. Send Mention Emails
            if (mentions && Array.isArray(mentions) && mentions.length > 0) {
                const serviceClient = createServiceRoleClient();
                // Fetch mentioned users with their preferences
                const { data: mentionedUsers } = await serviceClient
                    .from('profiles')
                    .select('id, email, full_name, notification_preferences')
                    .in('id', mentions);

                if (mentionedUsers) {
                    const specName = updatedThread.spec?.name || 'Specification';
                    const authorName = user.user_metadata?.full_name || 'Someone';
                    // Construct URL: /org/project/spec
                    const orgSlug = updatedThread.spec?.project?.organization?.slug;
                    const projectSlug = updatedThread.spec?.project?.slug;
                    const specSlug = updatedThread.spec?.slug;
                    const actionUrl = orgSlug && projectSlug && specSlug
                        ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${orgSlug}/${projectSlug}/${specSlug}`
                        : 'http://localhost:3000';

                    await Promise.all(mentionedUsers.map(async (mentionedUser) => {
                        // Check preferences (default to true if missing)
                        const prefs = mentionedUser.notification_preferences as any;
                        const shouldSend = prefs?.email_mentions !== false; // Default true

                        if (shouldSend && mentionedUser.email) {
                            try {
                                const { render } = await import('@react-email/render');
                                const MentionEmail = (await import('@/components/email/MentionEmail')).default;

                                const html = await render(
                                    MentionEmail({
                                        authorName,
                                        specName,
                                        commentBody,
                                        actionUrl,
                                    })
                                );

                                await sendEmail({
                                    to: mentionedUser.email,
                                    subject: `${authorName} mentioned you in ${specName}`,
                                    html,
                                });
                            } catch (renderError) {
                                console.error('Error rendering/sending email:', renderError);
                            }
                        }
                    }));
                }
            }

            // 2. Send New Comment Notifications to Thread Participants
            // Find all unique authors in this thread, excluding current user and mentioned users (to avoid double email)
            const participants = updatedThread.comments
                ?.map((c: any) => c.author)
                .filter((a: any) => a.id !== user.id && (!mentions || !mentions.includes(a.id)))
                .filter((a: any, index: number, self: any[]) => self.findIndex((t: any) => t.id === a.id) === index); // Unique

            if (participants && participants.length > 0) {
                const serviceClient = createServiceRoleClient();
                // Re-fetch to get preferences (if not in comment author relation) or just use what we have if we included it
                // We need preferences. author relation in comment might not have it unless we select it.
                // Let's fetch preferences for these IDs.
                const participantIds = participants.map((p: any) => p.id);
                const { data: participantProfiles } = await serviceClient
                    .from('profiles')
                    .select('id, email, notification_preferences')
                    .in('id', participantIds);

                if (participantProfiles) {
                    const specName = updatedThread.spec?.name || 'Specification';
                    const authorName = user.user_metadata?.full_name || 'Someone';
                    const orgSlug = updatedThread.spec?.project?.organization?.slug;
                    const projectSlug = updatedThread.spec?.project?.slug;
                    const specSlug = updatedThread.spec?.slug;
                    const actionUrl = orgSlug && projectSlug && specSlug
                        ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${orgSlug}/${projectSlug}/${specSlug}`
                        : 'http://localhost:3000';

                    await Promise.all(participantProfiles.map(async (profile) => {
                        const prefs = profile.notification_preferences as any;
                        const shouldSend = prefs?.email_comments !== false; // Default true

                        if (shouldSend && profile.email) {
                            const { render } = await import('@react-email/render');
                            const NewCommentEmail = (await import('@/components/email/NewCommentEmail')).default;

                            const html = await render(
                                NewCommentEmail({
                                    authorName,
                                    specName,
                                    commentBody,
                                    actionUrl,
                                })
                            );

                            await sendEmail({
                                to: profile.email,
                                subject: `New comment on ${specName}`,
                                html,
                            });
                        }
                    }));
                }
            }

        } catch (error) {
            console.error('Failed to send email notifications:', error);
        }

        // ... (existing mentions/sort logic) ...


        // Fetch mentions for all comments in this thread
        const commentIds = updatedThread.comments?.map((c: any) => c.id) || [];
        let mentionsMap: Record<string, any[]> = {};

        if (commentIds.length > 0) {
            const serviceClient = createServiceRoleClient();
            const { data: mentions } = await serviceClient
                .from('mentions')
                .select(`
                    id,
                    comment_id,
                    mentioned_user_id,
                    mentioned_user:profiles!mentioned_user_id (
                        id,
                        full_name,
                        email
                    )
                `)
                .in('comment_id', commentIds);

            if (mentions) {
                mentionsMap = mentions.reduce((acc: Record<string, any[]>, mention: any) => {
                    if (!acc[mention.comment_id]) {
                        acc[mention.comment_id] = [];
                    }
                    acc[mention.comment_id].push(mention);
                    return acc;
                }, {});
            }
        }

        // Sort comments before returning
        if (updatedThread?.comments) {
            updatedThread.comments = updatedThread.comments.sort((a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ).map((comment: any) => ({
                ...comment,
                mentions: mentionsMap[comment.id] || []
            }));
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

// Helper function to handle email notifications
async function sendCommentNotifications(
    specId: string,
    threadId: string,
    commentBody: string,
    mentions: string[],
    author: any
) {
    try {
        console.log('--- Email Notification Process Start ---');
        console.log('Mentions:', mentions);

        const supabase = createServiceRoleClient();

        // Fetch thread details to get Context (Spec Name, Project, Org) and Participants
        const { data: thread, error: threadError } = await supabase
            .from('comment_threads')
            .select(`
                *,
                spec:specs (
                    id,
                    name,
                    slug,
                    project:projects (
                        slug,
                        organization:organizations (
                            slug
                        )
                    )
                ),
                comments (
                    author:author_id (
                        id,
                        full_name,
                        email
                    )
                )
            `)
            .eq('id', threadId)
            .single();

        if (threadError || !thread) {
            console.error('Error fetching thread for notifications:', threadError);
            return;
        }

        const specName = thread.spec?.name || 'Specification';
        const authorName = author.user_metadata?.full_name || 'Someone';
        // Construct URL: /org/project/spec
        const orgSlug = thread.spec?.project?.organization?.slug;
        const projectSlug = thread.spec?.project?.slug;
        const specSlug = thread.spec?.slug;
        const actionUrl = orgSlug && projectSlug && specSlug
            ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${orgSlug}/${projectSlug}/${specSlug}`
            : 'http://localhost:3000';

        // 1. Send Mention Emails
        if (mentions && Array.isArray(mentions) && mentions.length > 0) {
            // Fetch mentioned users with their preferences
            const { data: mentionedUsers } = await supabase
                .from('profiles')
                .select('id, email, full_name, notification_preferences')
                .in('id', mentions);

            if (mentionedUsers) {
                await Promise.all(mentionedUsers.map(async (mentionedUser) => {
                    // Check preferences (default to true if missing)
                    const prefs = mentionedUser.notification_preferences as any;
                    const shouldSend = prefs?.email_mentions !== false;

                    if (shouldSend && mentionedUser.email) {
                        try {
                            const { render } = await import('@react-email/render');
                            const MentionEmail = (await import('@/components/email/MentionEmail')).default;

                            const html = await render(
                                MentionEmail({
                                    authorName,
                                    specName,
                                    commentBody,
                                    actionUrl,
                                })
                            );

                            await sendEmail({
                                to: mentionedUser.email,
                                subject: `${authorName} mentioned you in ${specName}`,
                                html,
                            });
                        } catch (renderError) {
                            console.error('Error rendering/sending mention email:', renderError);
                        }
                    }
                }));
            }
        }

        // 2. Send New Comment Notifications to Thread Participants
        // Find all unique authors in this thread, excluding current user and mentioned users
        const participants = thread.comments
            ?.map((c: any) => c.author)
            .filter((a: any) => a.id !== author.id && (!mentions || !mentions.includes(a.id)))
            .filter((a: any, index: number, self: any[]) => self.findIndex((t: any) => t.id === a.id) === index); // Unique

        if (participants && participants.length > 0) {
            const participantIds = participants.map((p: any) => p.id);
            const { data: participantProfiles } = await supabase
                .from('profiles')
                .select('id, email, notification_preferences')
                .in('id', participantIds);

            if (participantProfiles) {
                await Promise.all(participantProfiles.map(async (profile) => {
                    const prefs = profile.notification_preferences as any;
                    const shouldSend = prefs?.email_comments !== false;

                    if (shouldSend && profile.email) {
                        const { render } = await import('@react-email/render');
                        const NewCommentEmail = (await import('@/components/email/NewCommentEmail')).default;

                        const html = await render(
                            NewCommentEmail({
                                authorName,
                                specName,
                                commentBody,
                                actionUrl,
                            })
                        );

                        await sendEmail({
                            to: profile.email,
                            subject: `New comment on ${specName}`,
                            html,
                        });
                    }
                }));
            }
        }

    } catch (error) {
        console.error('Failed to process/send email notifications:', error);
    } finally {
        console.log('--- Email Notification Process End ---');
    }
}
