
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import assert from 'assert';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const BASE_URL = 'http://localhost:3000/api/public';

async function main() {
    console.log('🚀 Starting Public API Verification (File Name)...');

    // 1. Create Test User
    const email = `filename-test-${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`1. Creating test user: ${email}`);
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });
    if (userError) throw userError;
    const userId = user.user.id;

    // 2. Seed Org and Project
    const orgSlug = `test-org-${Date.now()}`;
    const projectSlug = `test-proj-${Date.now()}`;

    // Create Org
    const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({ name: 'Test Org', slug: orgSlug })
        .select()
        .single();
    if (orgError) throw orgError;

    // Add Member
    await supabaseAdmin.from('org_memberships').insert({
        org_id: org.id,
        user_id: userId,
        role: 'owner'
    });

    // Create Project
    const { data: project, error: projError } = await supabaseAdmin
        .from('projects')
        .insert({
            org_id: org.id,
            name: 'Test Project',
            slug: projectSlug
        })
        .select()
        .single();
    if (projError) throw projError;

    try {
        // 3. Login
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        const token = loginData.session.access_token;

        // 4. Create Spec with file_name
        console.log('\nCreating Spec with file_name...');
        const specName = 'File Name Test';
        const fileName = 'README.md';
        const specContent = '# Content';

        const createRes = await fetch(`${BASE_URL}/specs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: specName,
                content: specContent,
                project_slug: projectSlug,
                org_slug: orgSlug,
                file_name: fileName
            })
        });

        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(`Create failed: ${JSON.stringify(createData)}`);

        const specId = createData.spec.id;
        const specSlug = createData.spec.slug;

        console.log(`✅ Spec created: ${specId} (slug: ${specSlug})`);
        assert.strictEqual(createData.spec.file_name, fileName, 'file_name missing in create response');

        // 5. Get Spec by Slug
        console.log('\nFetching Spec by Slug...');
        const getRes = await fetch(`${BASE_URL}/specs/${specSlug}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const getData = await getRes.json();
        assert.strictEqual(getData.spec.file_name, fileName, 'file_name missing in get response');
        console.log('✅ Get spec verification passed: file_name matches.');

        // 6. List Specs
        console.log('\nListing Specs...');
        const listRes = await fetch(`${BASE_URL}/specs`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const listData = await listRes.json();
        const listedSpec = listData.specs.find((s: any) => s.id === specId);
        assert.strictEqual(listedSpec.file_name, fileName, 'file_name missing in list response');
        console.log('✅ List specs verification passed.');

    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await supabaseAdmin.auth.admin.deleteUser(userId);
        await supabaseAdmin.from('organizations').delete().eq('id', org.id);
        console.log('✅ Cleanup complete.');
    }
}

main().catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
