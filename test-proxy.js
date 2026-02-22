require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log('Querying projects...');
    const { data: projects, error: pErr } = await supabase
        .from('projects')
        .select('id, name, slug');
        
    if (pErr) console.error('Error:', pErr);
    else console.log(JSON.stringify(projects.filter(p => p.slug === 'podpdf' || p.slug === 'pdf-consultation-docs'), null, 2));

    console.log('Querying all specs in podpdf...');
    const podpdf = projects.find(p => p.slug === 'podpdf');
    if (podpdf) {
        const { data: specs, error: sErr } = await supabase
            .from('specs')
            .select('id, name, slug, source_spec_id')
            .eq('project_id', podpdf.id);
        
        if (sErr) console.error('Error specs:', sErr);
        else console.log('Specs in podpdf:', JSON.stringify(specs, null, 2));
    }
}
check();
