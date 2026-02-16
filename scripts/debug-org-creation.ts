
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for setup/cleanup
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    console.log('🚀 Starting Debug: Organization Creation...');

    // 1. Create Test User
    const email = `debug-org-${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`1. Creating test user: ${email}`);
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });
    if (userError) throw userError;
    const userId = user.user.id;

    let orgId: string | null = null;

    try {
        // 2. Login to get session (simulate client-side)
        console.log('2. Logging in...');
        const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();

        if (loginData.error) throw new Error(`Login failed: ${loginData.error_description}`);
        const token = loginData.access_token;
        console.log('   Logged in successfully.');

        // 3. Create Client acting as User
        const clientSupabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        });

        // 4. Try to create organization using RPC
        const orgName = 'Debug Org' + Date.now();
        const orgSlug = 'debug-org-' + Date.now();

        console.log(`3. Attempting to create organization via RPC: ${orgName} (${orgSlug})`);

        const { data: org, error: createError } = await clientSupabase
            .rpc('create_organization', {
                org_name: orgName,
                org_slug: orgSlug
            });

        if (createError) {
            console.error('❌ Organization creation FAILED');
            console.error('   Error:', JSON.stringify(createError, null, 2));
            return; // Stop here if this fails
        }

        console.log('✅ Organization creation SUCCEEDED');
        // org is returned as JSONB from RPC, so we need to cast or access properties carefully if strict types matched
        // for now just logging success is enough proof. 
        if (org && org.id) {
            orgId = org.id;
            console.log(`   Created Org ID: ${orgId}`);
        } else {
            console.log('   Warning: Org ID not returned in expected format', org);
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        if (orgId) await supabaseAdmin.from('organizations').delete().eq('id', orgId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
    }
}

main();
