
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

        // Check if current user is a member (optional if RLS covers it, but good for custom error)
        // Actually, let's just query members. If RLS is set up correctly, it might allow viewing members.

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

        const { email } = await req.json();
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

        // Find user by email
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User not found. Please ask them to sign up first.' }, { status: 404 });
        }

        // Check if already a member
        const { data: existingMember } = await supabase
            .from('org_memberships')
            .select('id')
            .eq('org_id', org.id)
            .eq('user_id', profile.id)
            .single();

        if (existingMember) {
            return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
        }

        // Add to org
        const { data: newMember, error: insertError } = await supabase
            .from('org_memberships')
            .insert({
                org_id: org.id,
                user_id: profile.id,
                role: 'member' // Default role
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

    } catch (error: any) {
        console.error('Error adding member:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
