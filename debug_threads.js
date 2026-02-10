
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2];
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching threads...');
    // Fetch threads that have quoted_text
    const { data: threads, error } = await supabase
        .from('comment_threads')
        .select('id, quoted_text, status')
        .not('quoted_text', 'is', null)
        .neq('status', 'resolved');

    if (error) {
        console.error('Error fetching threads:', error);
        return;
    }

    console.log(`Found ${threads.length} threads with quoted_text.`);

    threads.forEach(t => {
        if (t.quoted_text && t.quoted_text.includes('format')) {
            console.log(`\n--- Thread ${t.id} ---`);
            console.log('Stringified:', JSON.stringify(t.quoted_text));
        }
    });
}

main();
