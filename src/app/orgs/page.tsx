
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function OrgsIndexPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // specific query to get the first organization
    const { data: membership } = await supabase
        .from('org_memberships')
        .select('organization:organizations(slug)')
        .eq('user_id', user.id)
        .limit(1)
        .single();

    if (membership?.organization) {
        // Redirect to the first organization found
        // This effectively "removes the super level" by taking them directly into usage
        redirect(`/${(membership.organization as any).slug}`);
    } else {
        // No orgs, prompt to create one
        redirect('/new-org');
    }
}
