import { getAuthenticatedClient } from '@/lib/api-auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';
import { saveSpecContent } from '@/lib/storage/upload';
import { NextResponse } from 'next/server';
import { generateAISummary } from '@/lib/ai-summary';
import { indexSpecContent } from '@/lib/search/indexer';

export async function GET(request: Request) {
    const { user, supabase } = await getAuthenticatedClient();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse URL for query parameters
    const url = new URL(request.url);
    const projectSlug = url.searchParams.get('project_slug');

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
            projects!inner(slug, name),
            owner_id,
            revisions (
                id,
                revision_number,
                content_hash,
                created_at
            )
        `)
        .order('updated_at', { ascending: false });

    // Filter by project_slug if provided
    if (projectSlug) {
        query = query.eq('projects.slug', projectSlug);
    }

    // Get all specs visible to user
    const { data: specs, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Collect all source spec IDs for linked specs to fetch their actual revisions
    const sourceSpecIds = specs.filter(s => s.source_spec_id).map(s => s.source_spec_id);

    let sourceRevisions: Record<string, any> = {};
    if (sourceSpecIds.length > 0) {
        // Fetch the latest revision for each source spec
        const { data: revData } = await supabase
            .from('revisions')
            .select('spec_id, revision_number, content_hash, created_at')
            .in('spec_id', sourceSpecIds)
            // Note: Postgrest doesn't easily support LIMIT 1 per group, 
            // so we fetch all and group them in memory.
            .order('revision_number', { ascending: false });

        if (revData) {
            revData.forEach(rev => {
                if (!sourceRevisions[rev.spec_id]) {
                    sourceRevisions[rev.spec_id] = rev;
                }
            });
        }
    }

    // Process specs to include only the latest revision info
    const processedSpecs = specs.map(spec => {
        let latestRevision = null;

        if (spec.source_spec_id) {
            // It's a linked spec: grab the latest revision from our auxiliary fetch
            latestRevision = sourceRevisions[spec.source_spec_id];
        } else {
            // It's a standard spec: use its own revisions
            const sortedRevisions = spec.revisions?.sort((a: any, b: any) => b.revision_number - a.revision_number);
            latestRevision = sortedRevisions?.[0];
        }

        return {
            id: spec.id,
            name: spec.name,
            file_name: spec.file_name,
            slug: spec.slug,
            updated_at: spec.updated_at,
            project_id: spec.project_id,
            source_spec_id: spec.source_spec_id,
            is_linked: !!spec.source_spec_id,
            project_name: (spec.projects as any)?.name,
            latest_revision: latestRevision ? {
                revision_number: latestRevision.revision_number,
                content_hash: latestRevision.content_hash,
                created_at: latestRevision.created_at
            } : null
        };
    });

    return NextResponse.json({ specs: processedSpecs });
}

export async function POST(request: Request) {
    const { user, supabase } = await getAuthenticatedClient();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, content, project_id, file_name, slug: providedSlug, source_spec_id } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }
        if (!content && !source_spec_id) {
            return NextResponse.json({ error: 'Content or source_spec_id is required' }, { status: 400 });
        }

        // 1. Determine Project ID
        let targetProjectId = project_id;
        const projectSlug = body.project_slug;
        const orgSlug = body.org_slug;

        if (!targetProjectId) {
            if (projectSlug) {
                // Use service role client to bypass RLS for lookup
                const adminClient = createServiceRoleClient();
                let projectData: { id: string, org_id: string } | null = null;

                if (orgSlug) {
                    const { data, error } = await adminClient.from('projects')
                        .select('id, org_id, organizations!inner(slug)')
                        .eq('slug', projectSlug)
                        .eq('organizations.slug', orgSlug)
                        .single();

                    if (!error && data) {
                        projectData = { id: data.id, org_id: data.org_id };
                    }
                } else {
                    const { data, error } = await adminClient.from('projects')
                        .select('id, org_id')
                        .eq('slug', projectSlug)
                        .single();

                    if (!error && data) {
                        projectData = data;
                    }
                }

                if (!projectData) {
                    return NextResponse.json({ error: `Project not found with slug: ${projectSlug}${orgSlug ? ` in org: ${orgSlug}` : ''}` }, { status: 404 });
                }

                // Verify user is a member of the organization
                const { data: membership, error: memberError } = await adminClient
                    .from('org_memberships')
                    .select('id')
                    .eq('org_id', projectData.org_id)
                    .eq('user_id', user.id)
                    .single();

                if (memberError || !membership) {
                    return NextResponse.json({ error: 'You do not have access to this project.' }, { status: 403 });
                }

                targetProjectId = projectData.id;
            } else {
                // Determine default project (first one available)
                const { data: projects } = await supabase.from('projects').select('id').limit(1);
                if (projects && projects.length > 0) {
                    targetProjectId = projects[0].id;
                } else {
                    return NextResponse.json({ error: 'No project found. Please specify project_slug or project_id.' }, { status: 400 });
                }
            }
        }

        // 2. Parse Frontmatter if content exists
        let parsedMetadata: any = {};
        if (content) {
            try {
                const matter = require('gray-matter');
                const { data } = matter(content);
                if (data) {
                    parsedMetadata = data;
                }
            } catch (err) {
                console.error('Failed to parse frontmatter:', err);
                // Continue even if frontmatter parsing fails
            }
        }

        // Merge body metadata with frontmatter (body takes precedence if explicitly provided, 
        // otherwise frontmatter takes precedence, otherwise hardcoded defaults)
        const status = body.status || parsedMetadata.status || 'planned';
        const maturity = body.maturity || parsedMetadata.maturity || 'draft';
        const rawProgress = body.progress !== undefined ? body.progress : (parsedMetadata.progress !== undefined ? parsedMetadata.progress : 0);
        const progress = Math.min(99.9, Math.max(0, Number(rawProgress) || 0));

        let tags = body.tags || parsedMetadata.tags || null;
        if (typeof tags === 'string') {
            try {
                tags = JSON.parse(tags);
            } catch (e) {
                // If parsing fails, create an array with a single string
                tags = [tags];
            }
        } else if (tags && !Array.isArray(tags)) {
            // Ensure tags is an array if it's not null and not a string
            tags = [tags.toString()];
        }

        // 3. Generate Slug
        let slug = providedSlug || slugify(name);

        // 4. Create Spec
        const specPayload: any = {
            name,
            slug,
            file_name,
            project_id: targetProjectId,
            owner_id: user.id,
            status,
            maturity,
            progress,
            tags
        };

        if (source_spec_id) {
            specPayload.source_spec_id = source_spec_id;
        }

        const { data: spec, error: specError } = await supabase
            .from('specs')
            .insert(specPayload)
            .select()
            .single();

        if (specError) {
            if (specError.code === '23505') { // Unique violation
                return NextResponse.json({ error: 'Slug already exists. Please provide a unique slug.' }, { status: 409 });
            }
            return NextResponse.json({ error: specError.message }, { status: 500 });
        }

        // Return early if it's a linked spec - no content to upload
        if (source_spec_id) {
            return NextResponse.json({
                success: true,
                spec: {
                    id: spec.id,
                    slug: spec.slug,
                    name: spec.name,
                    file_name: spec.file_name,
                    source_spec_id: spec.source_spec_id,
                    latest_revision_number: null
                }
            });
        }

        // 4. Upload Content & Create Revision
        try {
            const revisionNumber = 1;
            const { contentKey, contentHash } = await saveSpecContent(spec.id, revisionNumber, content, supabase);

            const { data: revision, error: revError } = await supabase
                .from('revisions')
                .insert({
                    spec_id: spec.id,
                    revision_number: revisionNumber,
                    content_key: contentKey,
                    content_hash: contentHash,
                    summary: 'Initial version',
                    author_id: user.id,
                })
                .select()
                .single();

            if (revError) {
                // Cleanup spec
                await supabase.from('specs').delete().eq('id', spec.id);
                return NextResponse.json({ error: revError.message }, { status: 500 });
            }

            // 5. Fire-and-forget async tasks
            if (revision?.id) {
                generateAISummary(revision.id).catch(err =>
                    console.error('[AI Summary] Background generation failed:', err)
                );
            }
            await indexSpecContent(spec.id, content).catch(err =>
                console.error('[Search Indexer] Failed to index new spec content:', err)
            );

            return NextResponse.json({
                success: true,
                spec: {
                    id: spec.id,
                    slug: spec.slug,
                    name: spec.name,
                    file_name: spec.file_name,
                    latest_revision_number: 1
                }
            });

        } catch (uploadError: any) {
            // Cleanup spec
            await supabase.from('specs').delete().eq('id', spec.id);
            return NextResponse.json({ error: `Failed to upload content: ${uploadError.message}` }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
