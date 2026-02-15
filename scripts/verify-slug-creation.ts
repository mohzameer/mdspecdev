
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
    console.log('🚀 Starting Public API Verification (Project Slug)...');

    // 1. Create Test User
    const email = `slug-test-${Date.now()}@example.com`;
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

    // 2. Seed Org and Project with known slugs
    const orgSlug = `test-org-${Date.now()}`;
    const projectSlug = `test-proj-${Date.now()}`;

    console.log(`   Seeding Organization (${orgSlug}) and Project (${projectSlug})...`);

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
    console.log(`✅ Seeded Project: ${project.id}`);

    try {
        // 3. Login
        console.log('\n2. Testing /auth/login...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
        const token = loginData.session.access_token;
        console.log('✅ Login successful.');

        // 4. Create Spec using Project Slug
        console.log('\n3. Testing POST /specs (Create with project_slug)...');
        const specSlug = `spec-${Date.now()}`;
        const createRes = await fetch(`${BASE_URL}/specs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Slug Test Spec',
                content: '# Hello from Slug Test',
                project_slug: projectSlug, // USING SLUG HERE
                org_slug: orgSlug // Optional but good to test
            })
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(`Create spec failed: ${JSON.stringify(createData)}`);

        assert.ok(createData.spec.id, 'Spec ID missing');
        console.log(`✅ Spec created: ${createData.spec.id} (slug: ${createData.spec.slug})`);

        // 5. Verify Spec is in the correct project
        const { data: verifySpec } = await supabaseAdmin
            .from('specs')
            .select('project_id')
            .eq('id', createData.spec.id)
            .single();

        if (!verifySpec) throw new Error('Spec lookup failed');
        assert.strictEqual(verifySpec.project_id, project.id, 'Spec created in wrong project');
        console.log('✅ Spec project verification passed.');

    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await supabaseAdmin.auth.admin.deleteUser(userId);
        // Cascading deletes should handle the rest (org, project, spec) 
        await supabaseAdmin.from('organizations').delete().eq('id', org.id); // Should cascade project -> specs
        console.log('✅ Cleanup complete.');
    }
}

main().catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
