import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SpecCreationWizard } from './SpecCreationWizard';

export default async function NewSpecPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch user's organizations
    const { data: memberships } = await supabase
        .from('org_memberships')
        .select(`
            organization:organizations(
                id,
                name,
                slug
            )
        `)
        .eq('user_id', user.id);

    // Extract organizations from memberships
    const orgs = memberships
        ?.map((m: any) => m.organization)
        .filter(Boolean)
        .sort((a: any, b: any) => a.name.localeCompare(b.name)) || [];

    if (orgs.length === 0) {
        redirect('/new-org');
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-16 max-w-2xl">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                        Create New Specification
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Select where this specification should live.
                    </p>
                </div>

                <SpecCreationWizard initialOrgs={orgs} />
            </div>
        </div>
    );
}
