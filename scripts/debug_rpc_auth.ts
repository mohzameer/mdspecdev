
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseRoleKey);

async function debugAuth() {
    console.log('--- Debugging get_spec_by_slugs ---');

    // 1. Find ANY spec
    console.log('Finding a spec...');
    const { data: anySpec, error: anySpecError } = await supabaseAdmin
        .from('specs')
        .select(`
      id,
      slug,
      owner_id,
      is_public,
      project:projects(slug, org:organizations(slug, id))
    `)
        .limit(1)
        .maybeSingle();

    if (anySpecError || !anySpec) {
        console.error('Failed to find any spec:', anySpecError);
        return;
    }

    console.log(`Found spec: ${anySpec.slug} (ID: ${anySpec.id})`);
    console.log(`Owner ID: ${anySpec.owner_id}`);
    const org = (anySpec.project as any).org;
    const project = anySpec.project as any;

    console.log(`Org: ${org.slug} (${org.id})`);
    console.log(`Project: ${project.slug}`);
    console.log(`Is Public: ${anySpec.is_public}`);

    // 2. Call RPC as Service Role (Anonymous context regarding auth.uid)
    console.log('\nCalling RPC as Service Role (should fail if private)...');
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('get_spec_by_slugs', {
        p_org_slug: org.slug,
        p_project_slug: project.slug,
        p_spec_slug: anySpec.slug,
    });

    if (rpcError) console.error('RPC Error:', rpcError);
    else console.log('RPC Result:', rpcData ? 'Found Data' : 'NULL');

    // 3. Temporarily make public and test
    if (!anySpec.is_public) {
        console.log('\nTemporarily making spec public...');
        const { error: updateError } = await supabaseAdmin
            .from('specs')
            .update({ is_public: true })
            .eq('id', anySpec.id);

        if (updateError) {
            console.error('Failed to update spec:', updateError);
            return;
        }

        console.log('Calling RPC again...');
        const { data: publicRpcData, error: publicRpcError } = await supabaseAdmin.rpc('get_spec_by_slugs', {
            p_org_slug: org.slug,
            p_project_slug: project.slug,
            p_spec_slug: anySpec.slug,
        });

        console.log('RPC Result (After Public):', publicRpcData ? 'Found Data' : 'NULL');
        if (publicRpcData) {
            console.log('Is Member:', publicRpcData.spec.is_member);
        }

        // Revert
        console.log('Reverting spec visibility...');
        await supabaseAdmin.from('specs').update({ is_public: false }).eq('id', anySpec.id);
    }
}

debugAuth();
