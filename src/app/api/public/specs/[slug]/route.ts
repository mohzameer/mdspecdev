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

    // Get spec by slug
    const { data: spec, error } = await supabase
        .from('specs')
        .select(`
            id,
            name,
            file_name,
            slug,
            updated_at,
            project_id,
            owner_id,
            revisions (
                id,
                revision_number,
                content_key,
                content_hash,
                created_at
            )
        `)
        .eq('slug', slug)
        .single();

    if (error || !spec) {
        return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
    }

    // Get latest revision
    const sortedRevisions = spec.revisions?.sort((a: any, b: any) => b.revision_number - a.revision_number);
    const latestRevision = sortedRevisions?.[0];

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
            latest_revision: latestRevision ? {
                revision_number: latestRevision.revision_number,
                content_hash: latestRevision.content_hash,
                created_at: latestRevision.created_at
            } : null
        },
        content
    });
}
