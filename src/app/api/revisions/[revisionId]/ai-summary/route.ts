import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAISummary } from '@/lib/ai-summary';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ revisionId: string }> }
) {
    const { revisionId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await generateAISummary(revisionId);

    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ summary: result.summary, cached: result.cached });
}
