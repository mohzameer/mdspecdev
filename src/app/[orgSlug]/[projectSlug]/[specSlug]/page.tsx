import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { SpecViewer } from '@/components/spec/SpecViewer';

interface Props {
    params: Promise<{ orgSlug: string; projectSlug: string; specSlug: string }>;
}

export default async function SpecDetailPage({ params }: Props) {
    const { orgSlug, projectSlug, specSlug } = await params;
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
            redirect(`/${orgById.slug}/${projectSlug}/${specSlug}`);
        } else {
            redirect('/dashboard');
        }
    }

    // Resolve project by slug
    let project = null;
    const { data: projectBySlug } = await supabase
        .from('projects')
        .select('id, name, slug')
        .eq('slug', projectSlug)
        .eq('org_id', org.id)
        .single();

    if (projectBySlug) {
        project = projectBySlug;
    } else {
        const { data: projectById } = await supabase
            .from('projects')
            .select('id, name, slug')
            .eq('id', projectSlug)
            .eq('org_id', org.id)
            .single();

        if (projectById) {
            redirect(`/${org.slug}/${projectById.slug}/${specSlug}`);
        } else {
            redirect(`/${org.slug}`);
        }
    }

    // Now fetch spec using actual project ID
    const { data: spec } = await supabase
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
      created_at,
      updated_at,
      owner:profiles!specs_owner_id_fkey(id, full_name, avatar_url, email),
      revisions(id, revision_number, created_at, content_key, summary, ai_summary, author:profiles(full_name)),
      comment_threads(id, resolved, comments(id, deleted))
    `
        )
        .eq('project_id', project.id)
        .eq('slug', specSlug)
        .is('archived_at', null)
        .single();

    if (!spec) {
        redirect(`/${org.slug}/${project.slug}`);
    }

    const latestRevision = (spec.revisions as any[])?.sort(
        (a, b) => b.revision_number - a.revision_number
    )[0];

    let content = '';
    if (latestRevision?.content_key) {
        const { data } = await supabase.storage
            .from('spec-content')
            .download(latestRevision.content_key);
        if (data) {
            content = await data.text();
        }
    }

    const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n*/, '');

    const unresolvedCount =
        (spec.comment_threads as any[])?.filter((t) =>
            !t.resolved && t.comments?.some((c: any) => !c.deleted)
        ).length || 0;
    const revisionCount = (spec.revisions as any[])?.length || 0;

    // Fetch current user profile
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <div className="mb-4 text-sm">
                    <Link
                        href="/dashboard"
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                        Dashboard
                    </Link>
                    <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                    <Link
                        href={`/${org.slug}`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                        {org.name}
                    </Link>
                    <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                    <Link
                        href={`/${org.slug}/${project.slug}`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                        {project.name}
                    </Link>
                </div>

                <SpecViewer
                    content={contentWithoutFrontmatter}
                    spec={spec}
                    org={org}
                    project={project}
                    currentUser={currentUserProfile}
                    unresolvedCount={unresolvedCount}
                    revisionCount={revisionCount}
                    aiSummary={latestRevision?.ai_summary}
                    latestRevisionNumber={latestRevision?.revision_number || 1}
                />
            </div>
        </div>
    );
}
