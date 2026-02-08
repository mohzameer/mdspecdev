
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json([]);
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Search profiles by full_name or email
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

    if (error) {
        console.error('Error searching users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(profiles);
}
