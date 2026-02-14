
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- Debugging get_spec_by_slugs ---');

    // 1. Fetch any spec to get valid slugs
    const { data: spec, error: specError } = await supabase
        .from('specs')
        .select(`
      slug,
      project:projects(slug, org:organizations(slug))
    `)
        .limit(1)
        .single();

    if (specError || !spec) {
        console.error('Error fetching spec:', specError);
        return;
    }

    const orgSlug = (spec.project as any).org.slug;
    const projectSlug = (spec.project as any).slug;
    const specSlug = spec.slug;

    console.log(`Testing with: org=${orgSlug}, project=${projectSlug}, spec=${specSlug}`);

    // 2. Call RPC
    const { data, error } = await supabase.rpc('get_spec_by_slugs', {
        p_org_slug: orgSlug,
        p_project_slug: projectSlug,
        p_spec_slug: specSlug,
    });

    if (error) {
        console.error('RPC Error:', error);
    } else {
        console.log('RPC Result:', data ? 'Found data' : 'No data returned (null)');
        if (data) {
            console.log('Spec ID:', data.spec.id);
            console.log('Is Member:', data.spec.is_member);
        }
    }
}

debug();
