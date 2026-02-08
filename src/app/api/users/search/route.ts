
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const orgSlug = searchParams.get('orgSlug');

    if (!query || query.length < 2) {
        return NextResponse.json([]);
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let queryBuilder: any = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email');

    if (orgSlug) {
        // Find org id first
        const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single();

        if (org) {
            // Filter by membership in this org
            // Query: profiles where id IN (select user_id from org_memberships where org_id = org.id)
            // Supabase approach: inner join?
            // Actually, simple way:
            queryBuilder = supabase
                .from('profiles')
                .select('id, full_name, avatar_url, email, org_memberships!inner(org_id)')
                .eq('org_memberships.org_id', org.id);
        }
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
