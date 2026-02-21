'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateAISummary } from '@/lib/ai-summary';
import { indexSpecContent } from '@/lib/search/indexer';

export async function createRevision(formData: FormData) {
    const specId = formData.get('specId') as string;
    const content = formData.get('content') as string;
    const orgSlug = formData.get('orgSlug') as string;
    const projectSlug = formData.get('projectSlug') as string;
    const specSlug = formData.get('specSlug') as string;
    const revisionNumberStr = formData.get('revisionNumber') as string;
    const revisionNumber = parseInt(revisionNumberStr) + 1; // Increment revision

    // Metadata
    const name = formData.get('name') as string;
    const progressStr = formData.get('progress') as string;
    const progress = progressStr ? parseInt(progressStr) : null;
    const status = formData.get('status') as string;
    const maturity = formData.get('maturity') as string;
    const tagsStr = formData.get('tags') as string;
    const tags = tagsStr ? JSON.parse(tagsStr) : null;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();


    if (!user) {
        return { error: 'You must be logged in' };
    }

    // 0. Prevent revisions on linked specs
    const { data: specData, error: specFetchError } = await supabase
        .from('specs')
        .select('source_spec_id')
        .eq('id', specId)
        .single();

    if (specFetchError) {
        return { error: 'Failed to verify spec' };
    }
    if (specData.source_spec_id) {
        return { error: 'Cannot create revisions for a linked spec' };
    }

    // 1. Update Spec Metadata
    const { error: updateError } = await supabase
        .from('specs')
        .update({
            name,
            progress,
            status: status || null,
            maturity: maturity || null,
            tags,
        })
        .eq('id', specId);

    if (updateError) {
        return { error: updateError.message };
    }

    // 2. Upload Content to Storage
    // Use service role client for storage: upsert RLS is unreliable from server actions.
    // Security is enforced by the revisions table RLS (only owners/admins can insert).
    const serviceClient = createServiceRoleClient();
    const contentPath = `specs/${specId}/${revisionNumber}.md`;
    const { error: uploadError } = await serviceClient.storage
        .from('spec-content')
        .upload(contentPath, content, { contentType: 'text/markdown', upsert: true });

    if (uploadError) {
        return { error: `Failed to upload content: ${uploadError.message}` };
    }

    // 3. Create Revision row
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    const { data: revision, error: revisionError } = await supabase
        .from('revisions')
        .insert({
            spec_id: specId,
            revision_number: revisionNumber,
            content_key: contentPath,
            content_hash: contentHash,
            author_id: user.id,
        })
        .select('id')
        .single();

    if (revisionError) {
        return { error: revisionError.message };
    }

    if (revisionNumber >= 2 && revision?.id) {
        generateAISummary(revision.id).catch(err =>
            console.error('[AI Summary] Background generation failed:', err)
        );
    }

    // 5. Index Content for Search (Fire-and-forget)
    indexSpecContent(specId, content).catch(err =>
        console.error('[Search Indexer] Failed to index spec content:', err)
    );

    revalidatePath(`/${orgSlug}/${projectSlug}/${specSlug}`);
    return { success: true, path: `/${orgSlug}/${projectSlug}/${specSlug}` };
}

export async function createSpec(formData: FormData) {
    const projectId = formData.get('projectId') as string;
    const name = formData.get('name') as string;
    const specSlug = formData.get('slug') as string;
    const content = formData.get('content') as string;
    const frontmatter = formData.get('frontmatter') as string;

    // Org/Project Slugs for redirection
    const orgSlug = formData.get('orgSlug') as string;
    const projectSlug = formData.get('projectSlug') as string;

    // Metadata
    const progressStr = formData.get('progress') as string;
    const progress = progressStr ? parseInt(progressStr) : 0;
    const status = formData.get('status') as string;
    const maturity = formData.get('maturity') as string;
    const tagsStr = formData.get('tags') as string;
    const tags = tagsStr ? JSON.parse(tagsStr) : null;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'You must be logged in' };
    }

    // 1. Create Spec
    const { data: spec, error: specError } = await supabase
        .from('specs')
        .insert({
            project_id: projectId,
            name,
            slug: specSlug,
            owner_id: user.id,
            progress,
            status,
            maturity,
            tags: tags,
        })
        .select()
        .single();

    if (specError) {
        return { error: specError.message };
    }

    // 2. Upload Content
    // Use service role client for storage: upsert RLS is unreliable from server actions.
    const serviceClient = createServiceRoleClient();
    const fullContent = `${frontmatter}\n\n${content}`;
    const contentPath = `specs/${spec.id}/1.md`;

    const { error: uploadError } = await serviceClient.storage
        .from('spec-content')
        .upload(contentPath, fullContent, { contentType: 'text/markdown', upsert: true });

    if (uploadError) {
        // Cleanup spec if upload fails
        await supabase.from('specs').delete().eq('id', spec.id);
        return { error: `Failed to upload content: ${uploadError.message}` };
    }

    // 3. Create First Revision
    const encoder = new TextEncoder();
    const data = encoder.encode(fullContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    const { data: revision, error: revisionError } = await supabase.from('revisions').insert({
        spec_id: spec.id,
        revision_number: 1,
        content_key: contentPath,
        content_hash: contentHash,
        summary: 'Initial version',
        author_id: user.id,
    }).select().single();

    if (revisionError) {
        return { error: revisionError.message };
    }

    // 4. Async Tasks (Fire-and-forget)
    if (revision?.id) {
        generateAISummary(revision.id).catch(err =>
            console.error('[AI Summary] Background generation failed:', err)
        );
    }

    indexSpecContent(spec.id, fullContent).catch(err =>
        console.error('[Search Indexer] Failed to index new spec content:', err)
    );

    revalidatePath(`/${orgSlug}/${projectSlug}`);
    revalidatePath(`/dashboard`);

    return { success: true, path: `/${orgSlug}/${projectSlug}/${spec.slug}` };
}

export async function indexSpecAction(specId: string, content: string) {
    // Fire-and-forget indexing
    indexSpecContent(specId, content).catch(err =>
        console.error('[Search Indexer] Failed to index new spec content:', err)
    );
    return { success: true };
}

export async function copySpec(formData: FormData) {
    const sourceSpecId = formData.get('sourceSpecId') as string;
    const targetProjectId = formData.get('targetProjectId') as string;
    const newName = formData.get('newName') as string;
    const newSlug = formData.get('newSlug') as string;

    // These are needed for the redirect path
    const targetOrgSlug = formData.get('targetOrgSlug') as string;
    const targetProjectSlug = formData.get('targetProjectSlug') as string;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'You must be logged in' };
    }

    // 1. Fetch the source spec's latest revision content from storage
    const { data: revisions, error: revError } = await supabase
        .from('revisions')
        .select('content_key, revision_number')
        .eq('spec_id', sourceSpecId)
        .order('revision_number', { ascending: false })
        .limit(1);

    if (revError || !revisions || revisions.length === 0) {
        return { error: 'Could not find source spec content' };
    }

    const { data: sourceSpecData } = await supabase
        .from('specs')
        .select('progress, status, maturity, tags')
        .eq('id', sourceSpecId)
        .single();

    const serviceClient = createServiceRoleClient();
    const { data: contentBlob, error: downloadError } = await serviceClient.storage
        .from('spec-content')
        .download(revisions[0].content_key);

    if (downloadError || !contentBlob) {
        return { error: 'Failed to download source spec content' };
    }

    const content = await contentBlob.text();

    // 2. Create new spec in the target project
    const { data: newSpec, error: specError } = await supabase
        .from('specs')
        .insert({
            project_id: targetProjectId,
            name: newName,
            slug: newSlug,
            owner_id: user.id,
            progress: sourceSpecData?.progress ?? 0,
            status: sourceSpecData?.status ?? null,
            maturity: sourceSpecData?.maturity ?? null,
            tags: sourceSpecData?.tags ?? null,
        })
        .select()
        .single();

    if (specError) {
        return { error: specError.message };
    }

    // 3. Upload content to storage
    const contentPath = `specs/${newSpec.id}/1.md`;
    const { error: uploadError } = await serviceClient.storage
        .from('spec-content')
        .upload(contentPath, content, { contentType: 'text/markdown', upsert: true });

    if (uploadError) {
        await supabase.from('specs').delete().eq('id', newSpec.id);
        return { error: `Failed to upload content: ${uploadError.message}` };
    }

    // 4. Create first revision
    const encoder = new TextEncoder();
    const encoded = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const { data: revision, error: revisionError } = await supabase
        .from('revisions')
        .insert({
            spec_id: newSpec.id,
            revision_number: 1,
            content_key: contentPath,
            content_hash: contentHash,
            summary: `Copied from spec ${sourceSpecId}`,
            author_id: user.id,
        })
        .select()
        .single();

    if (revisionError) {
        return { error: revisionError.message };
    }

    // 5. Async fire-and-forget
    if (revision?.id) {
        generateAISummary(revision.id).catch(err =>
            console.error('[AI Summary] Background generation failed:', err)
        );
    }

    indexSpecContent(newSpec.id, content).catch(err =>
        console.error('[Search Indexer] Failed to index copied spec:', err)
    );

    revalidatePath(`/${targetOrgSlug}/${targetProjectSlug}`);
    revalidatePath(`/dashboard`);

    return { success: true, path: `/${targetOrgSlug}/${targetProjectSlug}/${newSpec.slug}` };
}

export async function createLinkedSpec(formData: FormData) {
    const sourceSpecId = formData.get('sourceSpecId') as string;
    const targetProjectId = formData.get('targetProjectId') as string;
    const newName = formData.get('newName') as string;
    const newSlug = formData.get('newSlug') as string;

    // These are needed for the redirect path
    const targetOrgSlug = formData.get('targetOrgSlug') as string;
    const targetProjectSlug = formData.get('targetProjectSlug') as string;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'You must be logged in' };
    }

    // 1. Fetch the source spec's metadata (progress, status, etc)
    const { data: sourceSpecData, error: sourceSpecError } = await supabase
        .from('specs')
        .select('progress, status, maturity, tags')
        .eq('id', sourceSpecId)
        .single();

    if (sourceSpecError || !sourceSpecData) {
        return { error: 'Could not find source spec' };
    }

    // 2. Create new linked spec in the target project
    const { data: newSpec, error: specError } = await supabase
        .from('specs')
        .insert({
            project_id: targetProjectId,
            name: newName,
            slug: newSlug,
            owner_id: user.id,
            progress: sourceSpecData.progress ?? 0,
            status: sourceSpecData.status ?? null,
            maturity: sourceSpecData.maturity ?? null,
            tags: sourceSpecData.tags ?? null,
            source_spec_id: sourceSpecId, // The crucial link
        })
        .select()
        .single();

    if (specError) {
        return { error: specError.message };
    }

    // 3. No revision or storage upload needed! The linked spec relies on the source spec.

    revalidatePath(`/${targetOrgSlug}/${targetProjectSlug}`);
    revalidatePath(`/dashboard`);

    return { success: true, path: `/${targetOrgSlug}/${targetProjectSlug}/${newSpec.slug}` };
}
