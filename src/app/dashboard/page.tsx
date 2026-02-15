import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ProgressBar } from '@/components/spec/ProgressBar';
import { StatusBadge, TagsList } from '@/components/spec/StatusBadge';
import { SpecListItem } from '@/components/dashboard/SpecListItem';
import { ProjectBadge } from '@/components/dashboard/ProjectBadge';
import { formatRelativeTime } from '@/lib/utils';

type SpecWithRelations = {
    id: string;
    name: string;
    slug: string;
    progress: number | null;
    status: 'planned' | 'in-progress' | 'completed' | null;
    maturity: string | null;
    tags: string[] | null;
    updated_at: string;
    archived_at: string | null;
    project: { id: string; name: string; slug: string; organization: { id: string; name: string; slug: string } };
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
    const { data: memberships } = await supabase
        .from('org_memberships')
        .select(
            `
      id,
      role,
      organization:organizations(id, name)
    `
        )
        .eq('user_id', user.id);

    // Filter handling
    const showArchived = searchParams?.archived === 'true';

    // Get specs from all user's orgs
    let query = supabase
        .from('specs')
        .select(
            `
      id,
      name,
      slug,
      progress,
      status,
      maturity,
      tags,
      updated_at,
      archived_at,
      owner:profiles!specs_owner_id_fkey(full_name, avatar_url),
      project:projects(
        id,
        name,
        slug,
        organization:organizations(id, name, slug)
      ),
      comment_threads(id, resolved, comments(id, deleted)),
      revisions(id)
    `
        );

    if (showArchived) {
        query = query.not('archived_at', 'is', null);
    } else {
        query = query.is('archived_at', null);
    }

    const { data: specs } = (await query
        .order('updated_at', { ascending: false })
        .limit(50)) as { data: SpecWithRelations[] | null };

    const hasOrgs = memberships && memberships.length > 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
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
                        <div className="flex gap-4">
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
                ) : !specs || specs.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <span className="text-3xl">📄</span>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                            {showArchived ? 'No archived specifications' : 'No specifications yet'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                            {showArchived
                                ? 'Archived specifications will appear here.'
                                : 'Create your first specification to get started.'}
                        </p>
                        {!showArchived && (
                            <Link
                                href="/new-spec"
                                className="inline-flex px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                            >
                                Create Specification
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-12">
                        {(() => {
                            // Group specs by project
                            const projectsMap = new Map<string, {
                                project: SpecWithRelations['project'];
                                specs: SpecWithRelations[];
                            }>();

                            specs.forEach(spec => {
                                const projectId = spec.project.id;
                                if (!projectsMap.has(projectId)) {
                                    projectsMap.set(projectId, {
                                        project: spec.project,
                                        specs: []
                                    });
                                }
                                projectsMap.get(projectId)!.specs.push(spec);
                            });

                            // Sort projects by latest update
                            const projects = Array.from(projectsMap.values()).sort((a, b) => {
                                const aLatest = Math.max(...a.specs.map(s => new Date(s.updated_at).getTime()));
                                const bLatest = Math.max(...b.specs.map(s => new Date(s.updated_at).getTime()));
                                return bLatest - aLatest;
                            });

                            return projects.map(({ project, specs }) => (
                                <section key={project.id}>
                                    <div className="flex items-center gap-3 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                            {project.name}
                                        </h2>
                                        <ProjectBadge orgSlug={project.organization.slug} projectSlug={project.slug} />
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {specs.map((spec) => (
                                            <SpecListItem
                                                key={spec.id}
                                                spec={spec}
                                                showArchivedStyle={showArchived}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ));
                        })()}
                    </div>
                )}
            </div>
        </div >
    );
}
