import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
const envPath = path.resolve(__dirname, '../.env.local');
let env: Record<string, string> = {};
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
            env[key.trim()] = values.join('=').trim().replace(/^['"]|['"]$/g, '');
        }
    });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE = 'http://localhost:3000/api/public';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars.');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const TEST_EMAIL = `api-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';

async function main() {
    console.log('🚀 Starting Public API Verification...');
    let userId: string | null = null;
    let orgId: string | null = null;
    let projectId: string | null = null;

    try {
        // 1. Create Test User
        console.log(`\n1. Creating test user: ${TEST_EMAIL}`);
        const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            email_confirm: true
        });

        if (createError) throw createError;
        userId = user.user.id;
        console.log('✅ User created:', userId);

        // 2. Seed Org and Project
        console.log('   Seeding Organization and Project...');
        const orgName = 'Test Org ' + Date.now().toString().slice(-4);
        const { data: org, error: orgError } = await supabaseAdmin.from('organizations').insert({
            name: orgName,
            slug: orgName.toLowerCase().replace(/ /g, '-'),
        }).select().single();
        if (orgError) throw orgError;
        orgId = org.id;

        const { error: memberError } = await supabaseAdmin.from('org_memberships').insert({
            org_id: orgId,
            user_id: userId,
            role: 'owner'
        });
        if (memberError) throw memberError;

        const { data: project, error: projError } = await supabaseAdmin.from('projects').insert({
            org_id: orgId,
            name: 'Test Project',
            slug: 'test-project',
            description: 'Created by verification script'
        }).select().single();
        if (projError) throw projError;
        projectId = project.id;
        console.log('✅ Seeded Project:', projectId);

        // 3. Login
        console.log('\n2. Testing /auth/login...');
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
        const loginData = await loginRes.json();
        const token = loginData.session.access_token;
        console.log('✅ Login successful.');

        // 4. List Specs (Empty)
        console.log('\n3. Testing GET /specs...');
        const listRes = await fetch(`${API_BASE}/specs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const listData = await listRes.json();
        console.log(`✅ Listed ${listData.specs?.length ?? 0} specs.`);

        // 5. Create Spec
        console.log('\n4. Testing POST /specs (Create)...');
        const specName = `API Test Spec ${Date.now()}`;
        const createRes = await fetch(`${API_BASE}/specs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: specName,
                content: '# Initial Content\nHello World',
                // Project ID should be auto-detected now as the user is in one project
            })
        });

        if (!createRes.ok) throw new Error(`Create spec failed: ${createRes.status} ${await createRes.text()}`);

        const createData = await createRes.json();
        console.log('✅ Spec created:', createData.spec.slug);
        const slug = createData.spec.slug;

        // 6. Upload Revision
        console.log(`\n5. Testing POST /specs/${slug}/revisions...`);
        const revRes = await fetch(`${API_BASE}/specs/${slug}/revisions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: '# Updated Content\nHello World v2',
                summary: 'API Update'
            })
        });

        if (!revRes.ok) throw new Error(`Upload revision failed: ${revRes.status} ${await revRes.text()}`);
        const revData = await revRes.json();
        console.log('✅ Revision uploaded:', revData.revision.revision_number);

        // 7. Verify List Update
        console.log('\n6. Verifying list update...');
        const listRes2 = await fetch(`${API_BASE}/specs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const listData2 = await listRes2.json();
        const ourSpec = listData2.specs.find((s: any) => s.slug === slug);
        if (ourSpec && ourSpec.latest_revision.revision_number === 2) {
            console.log('✅ List reflects updated revision (rev 2).');
        } else {
            console.error('❌ List did not update correctly:', ourSpec);
        }

    } catch (err: any) {
        console.error('❌ Verification failed:', err.message || err);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        if (userId) await supabaseAdmin.auth.admin.deleteUser(userId);
        // Cascading deletes usually handle org/project if configured, but let's be safe
        // Actually deleting user might leave org/project orphaned depending on FKs.
        // We can leave them or try to delete. 
        if (projectId) await supabaseAdmin.from('projects').delete().eq('id', projectId);
        if (orgId) await supabaseAdmin.from('organizations').delete().eq('id', orgId);
        console.log('✅ Cleanup complete.');
    }
}

main();
