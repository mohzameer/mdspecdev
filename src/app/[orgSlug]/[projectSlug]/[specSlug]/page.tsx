import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { SpecViewer, SpecInfo } from '@/components/spec/SpecViewer';

interface Props {
    params: Promise<{ orgSlug: string; projectSlug: string; specSlug: string }>;
}

interface SpecData extends SpecInfo {
    is_member: boolean;
    user_role?: string;
    project_id: string;
    revisions: {
        revision_number: number;
        content_key: string;
        ai_summary?: string;
    }[];
    comment_threads: {
        resolved: boolean;
        comments: { deleted: boolean }[];
    }[];
}

interface RPCResult {
    spec: SpecData;
    org: { name: string; slug: string };
    project: { name: string; slug: string };
}

export default async function SpecDetailPage({ params }: Props) {
    const { orgSlug, projectSlug, specSlug } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Call the security definer function to get spec details
    // This allows public access if spec is public, or member access if not
    const { data: result, error } = await supabase.rpc('get_spec_by_slugs', {
        p_org_slug: orgSlug,
        p_project_slug: projectSlug,
        p_spec_slug: specSlug,
    });

    if (error || !result) {
        // If user is not logged in and spec not found (or private), redirect to login
        if (!user) {
            redirect('/login');
        }
        // If logged in but spec not found or no access
        return notFound();
    }

    const { spec, org, project } = result as unknown as RPCResult;

    // Determine if this is a public view (read-only for non-members)
    // The RPC returns is_member boolean
    const isPublicView = !spec.is_member;

    // Determine if user can resolve threads (Owners, Admins, Members - NOT Viewers)
    // If user_role is missing (migration not run), default to true for backward compatibility if member
    const userRole = spec.user_role;
    const canResolve = !isPublicView && (
        userRole ? ['owner', 'admin', 'member'].includes(userRole) : true
    );

    const sortedRevisions = spec.revisions?.sort(
        (a, b) => b.revision_number - a.revision_number
    ) ?? [];
    const latestRevision = sortedRevisions[0];
    const previousRevision = sortedRevisions[1] ?? null;

    const downloadContent = async (contentKey: string): Promise<string> => {
        const { data } = await supabase.storage
            .from('spec-content')
            .download(contentKey);
        return data ? await data.text() : '';
    };

    let content = '';
    let previousRawContent = '';
    if (latestRevision?.content_key) {
        content = await downloadContent(latestRevision.content_key);
    }
    if (previousRevision?.content_key) {
        previousRawContent = await downloadContent(previousRevision.content_key);
    }

    // Use robust frontmatter stripping handling various newlines and spacing (handles stacked frontmatters)
    const frontmatterRegex = /^\s*---\r?\n([\s\S]*?)\r?\n---\r?\n+/;

    const stripFrontmatter = (raw: string) => {
        let stripped = raw;
        while (frontmatterRegex.test(stripped)) {
            stripped = stripped.replace(frontmatterRegex, '').trimStart();
        }
        return stripped;
    };

    let contentWithoutFrontmatter = content;
    let extractedFrontmatter = '';

    const match = contentWithoutFrontmatter.match(frontmatterRegex);
    if (match) {
        // We only want the first frontmatter block, and we'll keep the --- delimiters for display
        extractedFrontmatter = match[0].trim();
    }

    contentWithoutFrontmatter = stripFrontmatter(content);
    const previousContent = previousRawContent ? stripFrontmatter(previousRawContent) : undefined;

    const unresolvedCount =
        spec.comment_threads?.filter((t) =>
            !t.resolved && t.comments?.some((c) => !c.deleted)
        ).length || 0;
    const revisionCount = spec.revisions?.length || 0;

    // Fetch current user profile if logged in
    let currentUserProfile = null;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        currentUserProfile = profile;
    }

    // Fetch folders for the project (for Move to Folder in SpecViewer)
    let folders: any[] = [];
    if (!isPublicView && spec.project_id) {
        const { data: projectFolders } = await supabase
            .from('spec_folders')
            .select('id, project_id, parent_folder_id, name, slug, created_at, updated_at')
            .eq('project_id', spec.project_id)
            .order('name', { ascending: true });
        folders = projectFolders ?? [];
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                {/* Breadcrumb */}
                {!isPublicView && (
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
                )}

                <SpecViewer
                    content={contentWithoutFrontmatter}
                    previousContent={previousContent}
                    spec={spec}
                    org={org}
                    project={project}
                    currentUser={currentUserProfile}
                    unresolvedCount={unresolvedCount}
                    revisionCount={revisionCount}
                    aiSummary={latestRevision?.ai_summary}
                    latestRevisionNumber={latestRevision?.revision_number || 1}
                    isPublicView={isPublicView}
                    canResolve={canResolve}
                    frontmatter={extractedFrontmatter || undefined}
                    folders={folders}
                />
            </div>
        </div>
    );
}
