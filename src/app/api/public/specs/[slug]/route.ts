import { getAuthenticatedClient } from '@/lib/api-auth';
import { getSpecContent } from '@/lib/storage/download';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const { user, supabase } = await getAuthenticatedClient();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    let query = supabase
        .from('specs')
        .select(`
            id,
            name,
            file_name,
            slug,
            updated_at,
            project_id,
            source_spec_id,
            owner_id
        `);

    if (isUUID) {
        query = query.or(`id.eq.${slug},slug.eq.${slug}`);
    } else {
        query = query.eq('slug', slug);
    }

    const { data: spec, error } = await query.single();

    if (error || !spec) {
        return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }

    // Get latest revision (from source spec if linked)
    const { data: revisions } = await supabase
        .from('revisions')
        .select(`
            id,
            revision_number,
            content_key,
            content_hash,
            created_at
        `)
        .eq('spec_id', spec.source_spec_id || spec.id)
        .order('revision_number', { ascending: false })
        .limit(1);

    const latestRevision = revisions?.[0];

    let content = '';
    if (latestRevision?.content_key) {
        try {
            content = await getSpecContent(latestRevision.content_key, supabase);
        } catch (err: any) {
            console.error('[Get Spec] Failed to download content:', err);
            return NextResponse.json({ error: 'Failed to retrieve spec content' }, { status: 500 });
        }
    }

    return NextResponse.json({
        spec: {
            id: spec.id,
            name: spec.name,
            file_name: spec.file_name,
            slug: spec.slug,
            updated_at: spec.updated_at,
            project_id: spec.project_id,
            source_spec_id: spec.source_spec_id,
            latest_revision: latestRevision ? {
                revision_number: latestRevision.revision_number,
                content_hash: latestRevision.content_hash,
                created_at: latestRevision.created_at
            } : null
        },
        content
    });
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const { user, supabase } = await getAuthenticatedClient();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    let query = supabase
        .from('specs')
        .select('id, source_spec_id');

    if (isUUID) {
        query = query.or(`id.eq.${slug},slug.eq.${slug}`);
    } else {
        query = query.eq('slug', slug);
    }

    const { data: spec, error } = await query.single();

    if (error || !spec) {
        return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }

    if (!spec.source_spec_id) {
        return NextResponse.json({ error: 'Cannot unlink a non-linked specification' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
        .from('specs')
        .delete()
        .eq('id', spec.id);

    if (deleteError) {
        console.error('[Unlink Spec] Failed to delete spec:', deleteError);
        return NextResponse.json({ error: 'Failed to unlink specification' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Linked specification removed successfully' });
}
