import { getAuthenticatedClient } from '@/lib/api-auth';
import { saveSpecContent } from '@/lib/storage/upload';
import { NextResponse } from 'next/server';
import { generateAISummary } from '@/lib/ai-summary';
import { indexSpecContent } from '@/lib/search/indexer';
import { hashContent } from '@/lib/utils';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { user, supabase } = await getAuthenticatedClient();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;

    try {
        const body = await request.json();
        const { content, summary } = body;

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

        let query = supabase
            .from('specs')
            .select('id, name, source_spec_id');

        if (isUUID) {
            query = query.or(`id.eq.${slug},slug.eq.${slug}`);
        } else {
            query = query.eq('slug', slug);
        }

        const { data: spec, error: specFetchError } = await query.single();

        if (specFetchError || !spec) {
            return NextResponse.json({ error: 'Spec not found' }, { status: 404 });
        }

        if (spec.source_spec_id) {
            return NextResponse.json({ error: 'Cannot create revisions for a linked spec via API' }, { status: 403 });
        }

        // 2. Get latest revision number
        const { data: latestRevision, error: revFetchError } = await supabase
            .from('revisions')
            .select('revision_number, content_hash')
            .eq('spec_id', spec.id)
            .order('revision_number', { ascending: false })
            .limit(1)
            .single();

        let nextRevisionNumber = 1;
        if (latestRevision) {
            // Check if content matches latest (deduplication)
            const newHash = await hashContent(content);

            if (newHash === latestRevision.content_hash) {
                return NextResponse.json({
                    message: 'Content identical to latest revision',
                    revision_number: latestRevision.revision_number
                });
            }

            nextRevisionNumber = latestRevision.revision_number + 1;
        }

        // 3. Upload Content
        // Pass supabase client to avoid RLS error on storage upload
        const { contentKey, contentHash } = await saveSpecContent(spec.id, nextRevisionNumber, content, supabase);

        // 4. Create Revision Record
        const { data: revision, error: revError } = await supabase
            .from('revisions')
            .insert({
                spec_id: spec.id,
                revision_number: nextRevisionNumber,
                content_key: contentKey,
                content_hash: contentHash,
                summary: summary || null,
                author_id: user.id,
            })
            .select()
            .single();

        if (revError) {
            console.error('[Revisions API] Revision insert error:', revError);
            return NextResponse.json({ error: revError.message }, { status: 500 });
        }

        // 5. Update Spec Timestamp
        await supabase
            .from('specs')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', spec.id);

        // 6. Async Tasks
        if (revision?.id) {
            generateAISummary(revision.id).catch(err =>
                console.error('[AI Summary] Background generation failed:', err)
            );
        }
        indexSpecContent(spec.id, content, supabase).catch(err =>
            console.error('[Search Indexer] Failed to index spec content:', err)
        );

        return NextResponse.json({
            success: true,
            revision: {
                revision_number: nextRevisionNumber,
                content_hash: contentHash,
                created_at: revision.created_at
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
