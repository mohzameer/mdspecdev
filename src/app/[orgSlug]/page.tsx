import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ProgressBar } from '@/components/spec/ProgressBar';
import { StatusBadge, TagsList } from '@/components/spec/StatusBadge';
import { formatRelativeTime } from '@/lib/utils';
import { OrgDashboard } from '@/components/org/OrgDashboard';

interface Props {
    params: Promise<{ orgSlug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OrgDetailPage({ params, searchParams }: Props) {
    const { orgSlug } = await params;
    const searchParamsResolved = await searchParams;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Try to find org by slug first, then by ID
    let org = null;
    const { data: orgBySlug } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', orgSlug)
        .single();

    if (orgBySlug) {
        org = orgBySlug;
    } else {
        // Fallback to ID lookup for backwards compatibility
        const { data: orgById } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgSlug)
            .single();

        if (orgById) {
            // Redirect to slug-based URL
            redirect(`/${orgById.slug}`);
        }
    }

    if (!org) {
        redirect('/dashboard');
    }

    // Fetch all projects with their specs
    const { data: projects } = await supabase
        .from('projects')
        .select(`
            id, 
            name, 
            slug, 
            description, 
            created_at,
            specs(
                id,
                name,
                slug,
                progress,
                status,
                maturity,
                tags,
                updated_at,
                owner_id,
                owner:profiles!specs_owner_id_fkey(id, full_name, avatar_url),
                comment_threads(id, resolved),
                revisions(id)
            )
        `)
        .eq('org_id', org.id)
        .order('name');

    // Flatten all specs for filtering and metrics
    const allSpecs = projects?.flatMap(p =>
        (p.specs as any[] || []).map((s: any) => ({
            ...s,
            projectId: p.id,
            projectName: p.name,
            projectSlug: p.slug
        }))
    ) || [];

    // Calculate metrics
    const totalSpecs = allSpecs.length;
    const totalProjects = projects?.length || 0;
    const unresolvedComments = allSpecs.reduce((sum, s) =>
        sum + (s.comment_threads?.filter((t: any) => !t.resolved)?.length || 0), 0
    );
    const completedSpecs = allSpecs.filter(s => s.status === 'completed').length;
    const inProgressSpecs = allSpecs.filter(s => s.status === 'in-progress').length;
    const mySpecs = allSpecs.filter(s => s.owner_id === user.id);

    // Get unique owners for filter dropdown
    const owners = Array.from(new Map(
        allSpecs
            .filter(s => s.owner?.id)
            .map(s => [s.owner.id, { id: s.owner.id, name: s.owner.full_name }])
    ).values());

    // Get unique statuses
    const statuses = Array.from(new Set(allSpecs.map(s => s.status).filter(Boolean)));

    return (
        <OrgDashboard
            org={org}
            projects={projects || []}
            allSpecs={allSpecs}
            userId={user.id}
            metrics={{
                totalProjects,
                totalSpecs,
                unresolvedComments,
                completedSpecs,
                inProgressSpecs,
                mySpecsCount: mySpecs.length
            }}
            filterOptions={{
                projects: projects?.map(p => ({ id: p.id, name: p.name })) || [],
                owners,
                statuses
            }}
            initialFilters={{
                projectId: searchParamsResolved.project as string || '',
                status: searchParamsResolved.status as string || '',
                ownerId: searchParamsResolved.owner as string || '',
                search: searchParamsResolved.q as string || '',
                mySpecs: searchParamsResolved.my === 'true'
            }}
        />
    );
}
