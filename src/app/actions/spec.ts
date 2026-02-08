'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateAISummary } from '@/lib/ai-summary';

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

    // 2. Upload Content
    const contentPath = `specs/${specId}/${revisionNumber}.md`;
    const { error: uploadError } = await supabase.storage
        .from('spec-content')
        .upload(contentPath, content, { contentType: 'text/markdown', upsert: true });

    if (uploadError) {
        return { error: `Failed to upload content: ${uploadError.message}` };
    }

    // 3. Create Revision
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

    // 4. Trigger AI Summary (Backend Trigger)
    if (revisionNumber >= 2 && revision?.id) {
        // Call the function directly (fire-and-forget in Node environment)
        // This avoids HTTP roundtrip issues and is more robust
        generateAISummary(revision.id).catch(err =>
            console.error('[AI Summary] Background generation failed:', err)
        );
    }

    revalidatePath(`/${orgSlug}/${projectSlug}/${specSlug}`);
    return { success: true, path: `/${orgSlug}/${projectSlug}/${specSlug}` };
}
