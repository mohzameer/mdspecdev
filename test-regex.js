const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: revs, error: revError } = await supabase.from('revisions').select('content_key, spec_id');
  if (revError) {
    console.error("Error fetching revisions:", revError);
    return;
  }

  const regex1 = /^\s*---\r?\n[\s\S]*?\r?\n---\r?\n+/;

  for (const rev of revs) {
    if (!rev.content_key) continue;

    const { data, error } = await supabase.storage.from('spec-content').download(rev.content_key);
    if (error || !data) continue;

    const text = await data.text();
    const matched = regex1.test(text);

    if (!matched && text.includes('---')) {
      console.log(`Failed on spec: ${rev.spec_id}, key: ${rev.content_key}`);
      console.log("--- Content Start ---");
      console.log(text.substring(0, 150));
      console.log("--- Content End ---");
    }
  }
  console.log("Done checking all revisions.");
}

run();
