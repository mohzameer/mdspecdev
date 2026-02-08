
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ orgSlug: string }> }
) {
    const supabase = await createClient();
    const { orgSlug } = await context.params;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get Org ID
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single();

        if (orgError || !org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const { data: members, error } = await supabase
            .from('org_memberships')
            .select(`
                id,
                role,
                created_at,
                profile:profiles (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .eq('org_id', org.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(members);
    } catch (error: any) {
        console.error('Error fetching members:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ orgSlug: string }> }
) {
    const supabase = await createClient();
    const { orgSlug } = await context.params;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { email, password, fullName } = await req.json();
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Get Org ID
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single();

        if (orgError || !org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // Check if current user is admin/owner
        const { data: membership, error: membershipError } = await supabase
            .from('org_memberships')
            .select('role')
            .eq('org_id', org.id)
            .eq('user_id', user.id)
            .single();

        if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json({ error: 'Forbidden: Only admins can add members' }, { status: 403 });
        }

        // 1. Try to find existing profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        let userId = profile?.id;

        // 2. If no profile, and password provided, try to create user
        if (!userId && password) {
            // Need service role key for admin operations
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!serviceRoleKey) {
                return NextResponse.json({ error: 'Server configuration error: missing service role key' }, { status: 500 });
            }

            const adminClient = createAdminClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                serviceRoleKey,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                }
            );

            // Create user
            const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm for admin created users
                user_metadata: {
                    full_name: fullName
                }
            });

            if (createUserError) {
                return NextResponse.json({ error: `Failed to create user: ${createUserError.message}` }, { status: 400 });
            }

            if (newUser.user) {
                userId = newUser.user.id;
            }
        } else if (!userId) {
            return NextResponse.json({ error: 'User not found. Provide a password to create a new account.' }, { status: 404 });
        }

        // 3. Add to org (if userId exists)
        if (userId) {
            // Check if already a member
            const { data: existingMember } = await supabase
                .from('org_memberships')
                .select('id')
                .eq('org_id', org.id)
                .eq('user_id', userId)
                .single();

            if (existingMember) {
                return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
            }

            // Add to org
            const { data: newMember, error: insertError } = await supabase
                .from('org_memberships')
                .insert({
                    org_id: org.id,
                    user_id: userId,
                    role: 'member'
                })
                .select(`
                    id,
                    role,
                    created_at,
                    profile:profiles (
                        id,
                        full_name,
                        email,
                        avatar_url
                    )
                `)
                .single();

            if (insertError) throw insertError;
            return NextResponse.json(newMember);
        }

        return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });

    } catch (error: any) {
        console.error('Error adding member:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
