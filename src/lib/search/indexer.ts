import { createClient } from '@/lib/supabase/server';
import { extractHeadings, getSectionContent, generateHeadingId } from '@/lib/markdown/headings';

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Split spec content by headings and index into spec_sections
 */
export async function indexSpecContent(
    specId: string,
    content: string,
    client?: SupabaseClient
): Promise<void> {
    const supabase = client || await createClient();

    // 1. Parse markdown headings
    const headings = extractHeadings(content);

    // Add implicit "Introduction" (preamble before first heading)
    // We treat content before the first heading as a section too (maybe with id 'intro' or '')
    // But for simplicity, let's process explicit headings first, and maybe the top level content.
    // If the spec starts with content before any # heading, it might be missed by `getSectionContent` 
    // if not handled carefully. `getSectionContent` logic I saw earlier relies on finding the heading line.

    // Let's refine the approach:
    // We want to slice the content based on heading positions.
    // Since `extractHeadings` returns a list, we can iterate and get content.

    const sectionsToIndex: { heading_id: string; heading_text: string; content: string }[] = [];

    // Heuristic: If there is content before the first heading, index it as "Introduction"
    // Using a simple split might be more robust than getSectionContent for full coverage.
    // But `getSectionContent` is already available. Let's assume most specs use headings.
    // For now, let's index content under each Heading found.

    for (const heading of headings) {
        const sectionContent = getSectionContent(content, heading.text);
        if (sectionContent.trim()) {
            sectionsToIndex.push({
                heading_id: generateHeadingId(heading.text),
                heading_text: heading.text,
                content: sectionContent,
            });
        }
    }

    // 2. Clear existing sections for this spec
    // We do a full replace for simplicity and consistency
    const { error: deleteError } = await supabase
        .from('spec_sections')
        .delete()
        .eq('spec_id', specId);

    if (deleteError) {
        console.error('Error deleting spec sections:', deleteError);
        // Continue? Or throw? Throwing ensures we don't leave it in partial state if possible,
        // but since we deleted, we must insert.
        throw new Error(`Failed to clear existing search index: ${deleteError.message}`);
    }

    // 3. Insert new sections
    if (sectionsToIndex.length > 0) {
        const { error: insertError } = await supabase
            .from('spec_sections')
            .insert(
                sectionsToIndex.map(section => ({
                    spec_id: specId,
                    heading_id: section.heading_id,
                    heading_text: section.heading_text,
                    content: section.content
                }))
            );

        if (insertError) {
            console.error('Error inserting spec sections:', insertError);
            throw new Error(`Failed to update search index: ${insertError.message}`);
        }
    }
}
