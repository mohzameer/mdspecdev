
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch unread mentions with related comment/thread/spec info
    const { data: mentions, error } = await supabase
        .from('mentions')
        .select(`
      id,
      created_at,
      read,
      comment:comments!inner(
        id,
        body,
        author:profiles!comments_author_id_fkey(full_name, avatar_url),
        thread:comment_threads!inner(
           id,
           anchor_heading_id,
           spec:specs!inner(
             id,
             name,
             slug,
             project:projects!inner(
               slug,
               org:organizations!inner(slug)
             )
           )
        )
      )
    `)
        .eq('mentioned_user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mentions);
}

export async function PATCH(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mentionIds } = await request.json();

    if (!Array.isArray(mentionIds)) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { error } = await supabase
        .from('mentions')
        .update({ read: true })
        .in('id', mentionIds)
        .eq('mentioned_user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
