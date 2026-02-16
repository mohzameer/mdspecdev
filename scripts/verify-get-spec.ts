
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
    console.log('🚀 Starting Public API Verification (Get Spec)...');

    // 1. Create Test User
    const email = `get-spec-test-${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`1. Creating test user: ${email}`);
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });
    if (userError) throw userError;
    const userId = user.user.id;
    console.log(`✅ User created: ${userId}`);

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

        // 4. Create Spec
        console.log('\nCreating Spec...');
        const specName = 'Get Spec Test';
        const specContent = '# Content to Retrieve';
        const createRes = await fetch(`${BASE_URL}/specs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: specName,
                content: specContent,
                project_id: project.id
            })
        });
        const createData = await createRes.json();
        const specSlug = createData.spec.slug;
        console.log(`✅ Spec created: ${createData.spec.id} (slug: ${specSlug})`);

        // 5. Get Spec by Slug
        console.log('\nFetching Spec by Slug...');
        const getRes = await fetch(`${BASE_URL}/specs/${specSlug}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!getRes.ok) {
            const err = await getRes.json();
            throw new Error(`Get spec failed: ${JSON.stringify(err)}`);
        }

        const getData = await getRes.json();
        console.log('✅ Get spec response received');

        // Validation
        assert.strictEqual(getData.spec.slug, specSlug, 'Slug mismatch');
        assert.strictEqual(getData.spec.name, specName, 'Name mismatch');
        assert.strictEqual(getData.content, specContent, 'Content mismatch');
        assert.ok(getData.spec.latest_revision, 'Latest revision info missing');

        console.log('✅ Content verification passed: Content matches uploaded content.');

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
