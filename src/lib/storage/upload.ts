import { createClient } from '@/lib/supabase/server';
import { hashContent } from '@/lib/utils';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Save spec content to Supabase Storage
 * @param specId - The spec UUID
 * @param revisionNumber - The revision number
 * @param content - The markdown content
 * @param client - Optional Supabase client (for API usage)
 * @returns The storage path (content_key)
 */
export async function saveSpecContent(
    specId: string,
    revisionNumber: number,
    content: string,
    client?: SupabaseClient
): Promise<{ contentKey: string; contentHash: string }> {
    const supabase = client || await createClient();
    const path = `specs/${specId}/${revisionNumber}.md`;
    const contentHash = await hashContent(content);

    const { error } = await supabase.storage
        .from('spec-content')
        .upload(path, content, {
            contentType: 'text/markdown',
            upsert: false,
        });

    if (error) {
        throw new Error(`Failed to upload spec content: ${error.message}`);
    }

    return { contentKey: path, contentHash };
}

/**
 * Update existing spec content (for corrections, not new revisions)
 */
export async function updateSpecContent(
    contentKey: string,
    content: string
): Promise<string> {
    const supabase = await createClient();
    const contentHash = await hashContent(content);

    const { error } = await supabase.storage
        .from('spec-content')
        .update(contentKey, content, {
            contentType: 'text/markdown',
        });

    if (error) {
        throw new Error(`Failed to update spec content: ${error.message}`);
    }

    return contentHash;
}

/**
 * Delete spec content from storage
 */
export async function deleteSpecContent(contentKey: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.storage
        .from('spec-content')
        .remove([contentKey]);

    if (error) {
        throw new Error(`Failed to delete spec content: ${error.message}`);
    }
}
