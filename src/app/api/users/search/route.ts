
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const orgSlug = searchParams.get('orgSlug');

    if (!orgSlug && (!query || query.length < 2)) {
        return NextResponse.json([]);
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let queryBuilder;

    if (orgSlug) {
        // Find org id first
        const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single();

        if (org) {
            // Filter by membership in this org using inner join
            queryBuilder = supabase
                .from('profiles')
                .select('id, full_name, avatar_url, email, org_memberships!inner(org_id)')
                .eq('org_memberships.org_id', org.id);
        } else {
            // If org not found, return empty or fallback (here empty for safety)
            return NextResponse.json([]);
        }
    } else {
        // Global search (or maybe should be disabled/restricted?)
        // For now, let's keep it but maybe we should restrict it.
        // Given user request context, let's just default to searching all profiles if no org provided (legacy behavior)
        queryBuilder = supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email');
    }

    const { data: profiles, error } = await queryBuilder
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

    if (error) {
        console.error('Error searching users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clean up result (remove org_memberships from output if present)
    const cleanedProfiles = profiles?.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        email: p.email
    }));

    return NextResponse.json(cleanedProfiles);
}
