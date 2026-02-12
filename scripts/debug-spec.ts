import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3BlY2RldiIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MDk2NjY4MzUsImV4cCI6MjAyNTI0MjgzNX0.ExampleServiceRoleKeyForLocalDev';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const projectId = '06f73dfa-99af-4b1b-b365-1402b42a5808';
    const specSlug = 'edfusionweb';

    console.log('Querying spec with:', { projectId, specSlug });

    const { data: spec, error } = await supabase
        .from('specs')
        .select('*')
        .eq('project_id', projectId)
        .eq('slug', specSlug)
        .single();

    if (error) {
        console.error('Error fetching spec:', error);
    } else {
        console.log('Spec found:', spec);
        console.log('Archived At:', spec.archived_at);
    }

    // Check latest revision content
    if (spec) {
        const { data: revisions } = await supabase
            .from('revisions')
            .select('revision_number, id, content_key')
            .eq('spec_id', spec.id)
            .order('revision_number', { ascending: false })
            .limit(1);

        if (revisions && revisions.length > 0) {
            const rev = revisions[0];
            console.log('Latest Revision:', rev);

            const { data: contentData, error: contentError } = await supabase.storage
                .from('spec-content')
                .download(rev.content_key);

            if (contentError) {
                console.error('Error downloading content:', contentError);
            } else {
                const text = await contentData.text();
                console.log('--- Content Start ---');
                console.log(text.substring(0, 500));
                console.log('--- Content End ---');
            }
        } else {
            console.log('No revisions found.');
        }
    }
}

main().catch(console.error);
