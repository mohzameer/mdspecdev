'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { createRevision } from '@/app/actions/spec';

export default function EditSpecPage() {
    const params = useParams();
    const orgSlug = params.orgSlug as string;
    const projectSlug = params.projectSlug as string;
    const specSlug = params.specSlug as string;

    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [summary, setSummary] = useState('');
    const [specId, setSpecId] = useState('');
    const [projectId, setProjectId] = useState<string | null>(null);
    const [revisionNumber, setRevisionNumber] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        async function loadSpec() {
            try {
                // Resolve org by slug
                let orgId = null;
                const { data: orgBySlug } = await supabase
                    .from('organizations')
                    .select('id, slug')
                    .eq('slug', orgSlug)
                    .single();

                if (orgBySlug) {
                    orgId = orgBySlug.id;
                } else {
                    const { data: orgById } = await supabase
                        .from('organizations')
                        .select('id, slug')
                        .eq('id', orgSlug)
                        .single();

                    if (orgById) {
                        router.replace(
                            `/${orgById.slug}/${projectSlug}/${specSlug}/edit`
                        );
                        return;
                    } else {
                        router.push('/dashboard');
                        return;
                    }
                }

                // Resolve project by slug
                let resolvedProjectId = null;
                const { data: projectBySlug } = await supabase
                    .from('projects')
                    .select('id, slug')
                    .eq('slug', projectSlug)
                    .eq('org_id', orgId)
                    .single();

                if (projectBySlug) {
                    resolvedProjectId = projectBySlug.id;
                } else {
                    const { data: projectById } = await supabase
                        .from('projects')
                        .select('id, slug')
                        .eq('id', projectSlug)
                        .eq('org_id', orgId)
                        .single();

                    if (projectById) {
                        router.replace(
                            `/${orgSlug}/${projectById.slug}/${specSlug}/edit`
                        );
                        return;
                    } else {
                        router.push(`/${orgSlug}`);
                        return;
                    }
                }

                setProjectId(resolvedProjectId);

                // Get spec
                const { data: spec } = await supabase
                    .from('specs')
                    .select(
                        `
            id,
            name,
            revisions(revision_number, content_key)
          `
                    )
                    .eq('project_id', resolvedProjectId)
                    .eq('slug', specSlug)
                    .is('archived_at', null)
                    .single();

                if (!spec) {
                    router.push(`/${orgSlug}/${projectSlug}`);
                    return;
                }

                setSpecId(spec.id);
                setName(spec.name);

                // Get latest revision
                const latestRevision = (spec.revisions as any[])?.sort(
                    (a, b) => b.revision_number - a.revision_number
                )[0];

                if (latestRevision) {
                    setRevisionNumber(latestRevision.revision_number);

                    // Download content
                    const { data } = await supabase.storage
                        .from('spec-content')
                        .download(latestRevision.content_key);

                    if (data) {
                        setContent(await data.text());
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error(err);
                setError('Failed to load spec');
                setLoading(false);
            }
        }

        loadSpec();
    }, [supabase, orgSlug, projectSlug, specSlug, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // Parse frontmatter
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            let metadata: Record<string, any> = {};

            if (frontmatterMatch) {
                const yaml = frontmatterMatch[1];
                const lines = yaml.split('\n');
                for (const line of lines) {
                    const match = line.match(/^(\w+):\s*(.*)$/);
                    if (match) {
                        const key = match[1];
                        let value: any = match[2].trim();

                        if (value.startsWith('[') && value.endsWith(']')) {
                            value = value
                                .slice(1, -1)
                                .split(',')
                                .map((v: string) => v.trim())
                                .filter(Boolean);
                        }

                        if (!isNaN(Number(value)) && value !== '') {
                            value = Number(value);
                        }

                        metadata[key] = value;
                    }
                }
            }

            // Ensure tags is an array or null
            let tags: string[] | null = null;
            if (metadata.tags) {
                if (Array.isArray(metadata.tags)) {
                    tags = metadata.tags.filter((t: string) => t && t.trim());
                } else if (typeof metadata.tags === 'string') {
                    tags = [metadata.tags.trim()].filter(Boolean);
                }
                if (tags && tags.length === 0) tags = null;
            }

            // Validate and clamp progress to 0-100
            let progress: number | null = null;
            if (metadata.progress !== undefined && metadata.progress !== null) {
                const p = Number(metadata.progress);
                if (!isNaN(p)) {
                    progress = Math.max(0, Math.min(100, p));
                }
            }

            const formData = new FormData();
            formData.append('specId', specId);
            formData.append('content', content);
            formData.append('orgSlug', orgSlug);
            formData.append('projectSlug', projectSlug);
            formData.append('specSlug', specSlug);
            formData.append('revisionNumber', revisionNumber.toString());

            formData.append('name', name);
            if (progress !== null) formData.append('progress', progress.toString());
            if (metadata.status) formData.append('status', metadata.status);
            if (metadata.maturity) formData.append('maturity', metadata.maturity);
            if (tags) formData.append('tags', JSON.stringify(tags));

            const result: any = await createRevision(formData);

            if (result?.error) {
                setError(result.error);
                setSaving(false);
            } else if (result?.success && result?.path) {
                // Manual redirect on success to avoid NEXT_REDIRECT error
                router.push(result.path);
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-4">
                    <Link
                        href={`/${orgSlug}/${projectSlug}/${specSlug}`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm"
                    >
                        ← Back to spec
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Edit Specification
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                    Changes will create a new revision (v{revisionNumber + 1}).
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                        >
                            Specification name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label
                                htmlFor="summary"
                                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                            >
                                Summary of changes (optional)
                            </label>
                            <span className="text-xs text-slate-500 dark:text-slate-400 italic flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                AI summary will also be generated
                            </span>
                        </div>
                        <input
                            id="summary"
                            type="text"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="What changed in this revision?"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="content"
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                        >
                            Content
                        </label>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            rows={25}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm resize-none"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white font-medium rounded-lg transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
