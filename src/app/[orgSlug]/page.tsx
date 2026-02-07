import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

interface Props {
    params: Promise<{ orgSlug: string }>;
}

export default async function OrgDetailPage({ params }: Props) {
    const { orgSlug } = await params;
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

    const { data: projects } = await supabase
        .from('projects')
        .select('id, name, slug, description, created_at')
        .eq('org_id', org.id)
        .order('name');

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-4">
                    <Link
                        href="/dashboard"
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm"
                    >
                        ← Back to dashboard
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">
                                {org.name[0].toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                                {org.name}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400">Organization</p>
                        </div>
                    </div>
                    <Link
                        href={`/${org.slug}/new`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                    >
                        New Project
                    </Link>
                </div>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                    Projects
                </h2>

                {!projects || projects.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <span className="text-2xl">📁</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            No projects yet
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            Create a project to organize your specifications.
                        </p>
                        <Link
                            href={`/${org.slug}/new`}
                            className="inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Create Project
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/${org.slug}/${project.slug}`}
                                className="block p-6 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 transition-all duration-200 group shadow-sm"
                            >
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                                    {project.name}
                                </h3>
                                {project.description && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {project.description}
                                    </p>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
