import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ProjectHeaderActions } from './ProjectHeaderActions';
import { ProjectSpecList } from './ProjectSpecList';

interface Props {
    params: Promise<{ orgSlug: string; projectSlug: string }>;
    searchParams: Promise<{ archived?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: Props) {
    const { orgSlug, projectSlug } = await params;
    const { archived } = await searchParams;
    const showArchived = archived === 'true';

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Resolve org by slug
    let org = null;
    const { data: orgBySlug } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', orgSlug)
        .single();

    if (orgBySlug) {
        org = orgBySlug;
    } else {
        const { data: orgById } = await supabase
            .from('organizations')
            .select('id, name, slug')
            .eq('id', orgSlug)
            .single();

        if (orgById) {
            redirect(`/${orgById.slug}/${projectSlug}`);
        } else {
            redirect('/dashboard');
        }
    }

    // Resolve project by slug
    let project = null;
    const { data: projectBySlug } = await supabase
        .from('projects')
        .select('id, name, slug, description')
        .eq('slug', projectSlug)
        .eq('org_id', org.id)
        .single();

    if (projectBySlug) {
        project = projectBySlug;
    } else {
        const { data: projectById } = await supabase
            .from('projects')
            .select('id, name, slug, description')
            .eq('id', projectSlug)
            .eq('org_id', org.id)
            .single();

        if (projectById) {
            redirect(`/${org.slug}/${projectById.slug}`);
        } else {
            redirect(`/${org.slug}`);
        }
    }

    // Fetch specs — active or archived depending on filter
    // NOTE: filters must be applied before .order() on the Supabase builder
    let specsQuery = supabase
        .from('specs')
        .select(
            `
      id,
      name,
      slug,
      file_name,
      folder_id,
      progress,
      status,
      maturity,
      tags,
      source_spec_id,
      updated_at,
      owner:profiles!specs_owner_id_fkey(full_name, avatar_url),
      comment_threads(id, resolved),
      revisions(id)
    `
        )
        .eq('project_id', project.id);

    if (showArchived) {
        specsQuery = specsQuery.filter('archived_at', 'not.is', null);
    } else {
        specsQuery = specsQuery.is('archived_at', null);
    }

    const { data: specs } = await specsQuery.order('updated_at', { ascending: false });


    // Fetch all folders for this project (flat list; tree is built client-side)
    const { data: folders } = await supabase
        .from('spec_folders')
        .select('id, project_id, parent_folder_id, name, slug, created_at, updated_at')
        .eq('project_id', project.id)
        .order('name', { ascending: true });

    const baseUrl = `/${org.slug}/${project.slug}`;


    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-4">
                    <Link
                        href={`/${org.slug}`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm"
                    >
                        ← Back to {org.name}
                    </Link>
                </div>

                <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {project.name}
                        </h1>
                        {project.description && (
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                {project.description}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Active / Archived toggle */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                            <Link
                                href={baseUrl}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${!showArchived
                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                Active
                            </Link>
                            <Link
                                href={`${baseUrl}?archived=true`}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${showArchived
                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                Archived
                            </Link>
                        </div>
                        <ProjectHeaderActions
                            orgSlug={org.slug}
                            projectSlug={project.slug}
                            projectId={project.id}
                        />
                    </div>
                </div>

                <ProjectSpecList
                    folders={(folders ?? []) as any}
                    specs={(specs ?? []) as any}
                    orgSlug={org.slug}
                    projectSlug={project.slug}
                    projectId={project.id}
                    showArchived={showArchived}
                />
            </div>
        </div>
    );
}
