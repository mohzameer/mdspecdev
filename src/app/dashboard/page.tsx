import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ProgressBar } from '@/components/spec/ProgressBar';
import { StatusBadge, TagsList } from '@/components/spec/StatusBadge';
import { SpecListItem } from '@/components/dashboard/SpecListItem';
import { ProjectBadge } from '@/components/dashboard/ProjectBadge';
import { formatRelativeTime } from '@/lib/utils';

// Define types for our data
type Project = {
    id: string;
    name: string;
    slug: string;
    updated_at: string;
    organization: {
        id: string;
        name: string;
        slug: string;
    };
};

type SpecWithRelations = {
    id: string;
    name: string;
    slug: string;
    file_name?: string | null;
    progress: number | null;
    status: 'planned' | 'in-progress' | 'completed' | null;
    maturity: string | null;
    tags: string[] | null;
    updated_at: string;
    archived_at: string | null;
    project_id: string;
    owner: { full_name: string | null; avatar_url: string | null } | null;
    comment_threads: { id: string; resolved: boolean; comments: { id: string; deleted: boolean }[] }[];
    revisions: { id: string }[];
};

export default async function DashboardPage(props: { searchParams: Promise<{ archived?: string }> }) {
    const searchParams = await props.searchParams;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get user's org memberships
    const { data: memberships } = (await supabase
        .from('org_memberships')
        .select(`
            id,
            role,
            org_id
        `)
        .eq('user_id', user.id)) as { data: { id: string; role: string; org_id: string }[] | null };

    const hasOrgs = memberships && memberships.length > 0;
    const orgIds = memberships?.map((m) => m.org_id) || [];

    // Filter handling
    const showArchived = searchParams?.archived === 'true';

    // 1. Fetch all projects for the user's organizations
    let projects: Project[] = [];
    if (orgIds.length > 0) {
        const { data } = await supabase
            .from('projects')
            .select(`
                id,
                name,
                slug,
                updated_at,
                organization:organizations(id, name, slug)
            `)
            .in('org_id', orgIds)
            .order('updated_at', { ascending: false });

        if (data) projects = data as unknown as Project[];
    }

    // 2. Fetch specs for these projects
    let specs: SpecWithRelations[] = [];
    if (projects.length > 0) {
        let query = supabase
            .from('specs')
            .select(`
                id,
                name,
                slug,
                file_name,
                progress,
                status,
                maturity,
                tags,
                updated_at,
                archived_at,
                project_id,
                owner:profiles!specs_owner_id_fkey(full_name, avatar_url),
                comment_threads(id, resolved, comments(id, deleted)),
                revisions(id)
            `)
            .in('project_id', projects.map(p => p.id));

        if (showArchived) {
            query = query.not('archived_at', 'is', null);
        } else {
            query = query.is('archived_at', null);
        }

        const { data } = await query.order('updated_at', { ascending: false });
        if (data) specs = data as unknown as SpecWithRelations[];
    }

    // Helper: count unresolved comments on a spec
    const unresolvedCount = (spec: SpecWithRelations) =>
        spec.comment_threads.filter(
            t => !t.resolved && t.comments.some(c => !c.deleted)
        ).length;

    // 3. Combine projects and specs, sorting specs within each project
    const projectsWithSpecs = projects.map(project => {
        const projectSpecs = specs
            .filter(spec => spec.project_id === project.id)
            .sort((a, b) => {
                // Specs with unresolved comments first
                const diff = unresolvedCount(b) - unresolvedCount(a);
                if (diff !== 0) return diff;
                // Then by most recently updated
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });
        return {
            ...project,
            specs: projectSpecs
        };
    });

    // Sort projects:
    // - projects with specs sort before empty projects
    // - within non-empty projects, sort by most recently updated spec
    // - empty projects sort by project updated_at
    projectsWithSpecs.sort((a, b) => {
        const aHasSpecs = a.specs.length > 0;
        const bHasSpecs = b.specs.length > 0;

        // Push empty projects to the end
        if (aHasSpecs && !bHasSpecs) return -1;
        if (!aHasSpecs && bHasSpecs) return 1;

        const aLatestSpec = aHasSpecs ? Math.max(...a.specs.map(s => new Date(s.updated_at).getTime())) : 0;
        const bLatestSpec = bHasSpecs ? Math.max(...b.specs.map(s => new Date(s.updated_at).getTime())) : 0;

        const aTime = aHasSpecs ? aLatestSpec : new Date(a.updated_at).getTime();
        const bTime = bHasSpecs ? bLatestSpec : new Date(b.updated_at).getTime();

        return bTime - aTime;
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8 pb-24">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            Dashboard
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Your specifications at a glance
                        </p>
                    </div>
                    {hasOrgs && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                                <Link
                                    href="/dashboard"
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${!showArchived ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    Active
                                </Link>
                                <Link
                                    href="/dashboard?archived=true"
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${showArchived ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    Archived
                                </Link>
                            </div>
                            <Link
                                href="/new-spec"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                            >
                                New Spec
                            </Link>
                        </div>
                    )}
                </div>

                {!hasOrgs ? (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <span className="text-3xl">🏢</span>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                            No organizations yet
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                            Create an organization to start managing your specifications.
                            Organizations help you group projects and collaborate with your team.
                        </p>
                        <Link
                            href="/new-org"
                            className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Create Organization
                        </Link>
                    </div>
                ) : projectsWithSpecs.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <span className="text-3xl">📁</span>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                            No projects found
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                            Create a project to start adding specifications.
                        </p>
                        <Link
                            href="/new-spec"
                            className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Create Specification
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {projectsWithSpecs.map((project) => (
                            <section key={project.id}>
                                {/* Project header */}
                                <div className="flex items-center gap-3 mb-1 pb-2 border-b border-slate-200 dark:border-slate-800">
                                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                        {project.name}
                                    </h2>
                                    <ProjectBadge orgSlug={project.organization.slug} projectSlug={project.slug} />
                                </div>

                                {project.specs.length > 0 ? (
                                    <div>
                                        {/* Spec rows */}
                                        <div className="flex flex-col gap-1">
                                            {project.specs.map((spec) => (
                                                <SpecListItem
                                                    key={spec.id}
                                                    spec={{
                                                        ...spec,
                                                        project: {
                                                            id: project.id,
                                                            name: project.name,
                                                            slug: project.slug,
                                                            organization: project.organization,
                                                        },
                                                    }}
                                                    showArchivedStyle={showArchived}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-3 py-5 text-sm text-slate-400 dark:text-slate-600 italic">
                                        {showArchived
                                            ? 'No archived specifications in this project'
                                            : 'No specifications have been created in this project'}
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
