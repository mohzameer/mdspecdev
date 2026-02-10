
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
            console.log('Raw:', t.quoted_text);
            console.log('Stringified:', JSON.stringify(t.quoted_text));
            console.log('Hex:', Buffer.from(t.quoted_text).toString('hex'));
        }
    });
}

main();
