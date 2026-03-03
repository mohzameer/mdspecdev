import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ProjectHeaderActions } from './ProjectHeaderActions';
import { ProjectSpecList } from './ProjectSpecList';

interface Props {
    params: Promise<{ orgSlug: string; projectSlug: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
    const { orgSlug, projectSlug } = await params;
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

    // Fetch specs
    const { data: specs } = await supabase
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
        .eq('project_id', project.id)
        .is('archived_at', null)
        .order('updated_at', { ascending: false });

    // Fetch all folders for this project (flat list; tree is built client-side)
    const { data: folders } = await supabase
        .from('spec_folders')
        .select('id, project_id, parent_folder_id, name, slug, created_at, updated_at')
        .eq('project_id', project.id)
        .order('name', { ascending: true });

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
                    <ProjectHeaderActions
                        orgSlug={org.slug}
                        projectSlug={project.slug}
                        projectId={project.id}
                    />
                </div>

                <ProjectSpecList
                    folders={(folders ?? []) as any}
                    specs={(specs ?? []) as any}
                    orgSlug={org.slug}
                    projectSlug={project.slug}
                    projectId={project.id}
                />
            </div>
        </div>
    );
}
