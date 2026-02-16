import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get spec content from Supabase Storage
 * @param contentKey - The storage path (e.g., "specs/{spec_id}/{revision_number}.md")
 * @param client - Optional authenticated Supabase client (defaults to cookie-based client)
 * @returns The markdown content
 */
export async function getSpecContent(contentKey: string, client?: SupabaseClient): Promise<string> {
    const supabase = client || await createClient();

    const { data, error } = await supabase.storage
        .from('spec-content')
        .download(contentKey);

    if (error) {
        throw new Error(`Failed to download spec content: ${error.message}`);
    }

    return await data.text();
}

/**
 * Get a signed URL for spec content (expires in 1 hour by default)
 */
export async function getSpecContentUrl(
    contentKey: string,
    expiresIn: number = 3600
): Promise<string> {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
        .from('spec-content')
        .createSignedUrl(contentKey, expiresIn);

    if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
}

/**
 * Check if spec content exists
 */
export async function specContentExists(contentKey: string): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
        .from('spec-content')
        .list(contentKey.split('/').slice(0, -1).join('/'), {
            search: contentKey.split('/').pop(),
        });

    if (error) {
        return false;
    }

    return data.length > 0;
}
