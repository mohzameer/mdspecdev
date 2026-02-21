const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: revs } = await supabase.from('revisions').select('content_key, spec_id').order('created_at', { ascending: false });

    const regex1 = /^\s*---\r?\n[\s\S]*?\r?\n---\r?\n+/;

    for (const rev of revs) {
        if (!rev.content_key) continue;

        const { data, error } = await supabase.storage.from('spec-content').download(rev.content_key);
        if (error || !data) continue;

        const text = await data.text();
        const body = text.replace(regex1, '').trimStart();

        // Check if body STILL has frontmatter-like content
        if (body.startsWith('---')) {
            console.log(`Spec ${rev.spec_id} has DUPLICATE frontmatter in key: ${rev.content_key}`);
            console.log(body.substring(0, 100));
        }
    }
    console.log("Done checking for duplicate frontmatters.");
}

run();
