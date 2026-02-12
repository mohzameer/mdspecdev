
import { createClient } from '@supabase/supabase-js';
import { indexSpecContent } from '../src/lib/search/indexer';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function reindexAll() {
    console.log('Starting re-index...');

    // Fetch all specs
    const { data: specs, error } = await supabase
        .from('specs')
        .select('id, name, revisions(revision_number, content_key)');

    if (error) {
        console.error('Error fetching specs:', error);
        return;
    }

    console.log(`Found ${specs.length} specs to process.`);

    for (const spec of specs) {
        console.log(`Processing spec: ${spec.name} (${spec.id})`);

        // Find latest revision
        if (!spec.revisions || spec.revisions.length === 0) {
            console.log('  No revisions found, skipping.');
            continue;
        }

        const latestRevision = spec.revisions.reduce((prev, current) =>
            (prev.revision_number > current.revision_number) ? prev : current
        );

        console.log(`  Latest revision: ${latestRevision.revision_number}`);

        // Download content
        const { data: contentBlob, error: downloadError } = await supabase
            .storage
            .from('spec-content')
            .download(latestRevision.content_key);

        if (downloadError) {
            console.error(`  Error downloading content for revision ${latestRevision.revision_number}:`, downloadError);
            continue;
        }

        const content = await contentBlob.text();

        // Index
        try {
            await indexSpecContent(spec.id, content, supabase);
            console.log('  Indexed successfully.');
        } catch (idxError) {
            console.error('  Error indexing:', idxError);
        }
    }

    console.log('Done.');
}

reindexAll();
