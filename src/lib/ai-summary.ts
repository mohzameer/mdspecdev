
import { createServiceRoleClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

export async function generateAISummary(revisionId: string) {

    const supabase = createServiceRoleClient();

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
        console.log('[AI Summary] No OpenAI API key configured');
        return { error: 'OpenAI API key not configured' };
    }

    try {
        // Get the revision
        const { data: revision, error: revisionError } = await supabase
            .from('revisions')
            .select(`
id,
    revision_number,
    content_key,
    summary,
    ai_summary,
    spec_id
        `)
            .eq('id', revisionId)
            .single();

        if (revisionError || !revision) {
            console.error('[AI Summary] Revision not found:', revisionError);
            return { error: 'Revision not found' };
        }

        // Check if we already have a cached AI summary
        if (revision.ai_summary) {
            return { summary: revision.ai_summary, cached: true };
        }

        // Get the previous revision
        const { data: previousRevision } = await supabase
            .from('revisions')
            .select('id, revision_number, content_key')
            .eq('spec_id', revision.spec_id)
            .eq('revision_number', revision.revision_number - 1)
            .single();

        if (!previousRevision) {
            return { error: 'No previous revision to compare against' };
        }

        // Get content from storage
        async function getContent(contentKey: string): Promise<string> {
            const { data } = await supabase.storage
                .from('spec-content')
                .download(contentKey);
            if (data) {
                const text = await data.text();
                return text.replace(/^---[\s\S]*?---\n*/, '');
            }
            return '';
        }

        const [oldContent, newContent] = await Promise.all([
            getContent(previousRevision.content_key),
            getContent(revision.content_key)
        ]);

        // Create OpenAI client
        const openai = new OpenAI({
            apiKey: openaiApiKey
        });

        // Generate AI summary
        const prompt = `You are analyzing changes between two versions of a technical specification document.

PREVIOUS VERSION:
${oldContent.slice(0, 6000)}

CURRENT VERSION:
${newContent.slice(0, 6000)}

Please provide a concise summary of the changes.Focus on:
1. What sections were added, removed, or modified
2. Key content changes(new requirements, updated specifications, etc.)
3. Any significant structural changes

Format your response as a brief summary paragraph followed by bullet points for specific changes.
Keep your response under 300 words.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo-16k',
            messages: [
                {
                    role: 'system',
                    content: 'You are a technical documentation analyst. Provide clear, concise summaries of document changes.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.3
        });

        const aiSummary = completion.choices[0]?.message?.content || 'Unable to generate summary.';

        // Update the revision with the summary
        const { error: updateError } = await supabase
            .from('revisions')
            .update({ ai_summary: aiSummary })
            .eq('id', revisionId);

        if (updateError) {
            console.error('[AI Summary] Failed to save:', updateError);
            return { error: 'Failed to save summary' };
        }

        return { summary: aiSummary, cached: false };

    } catch (error) {
        console.error('[AI Summary] Error:', error);
        return { error: 'Failed to generate AI summary' };
    }
}
