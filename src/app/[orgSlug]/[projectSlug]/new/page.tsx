'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { slugify } from '@/lib/utils';
import { Status, Maturity, SpecFolder } from '@/lib/types';
import { SpecMetadataEditor } from '@/components/spec/SpecMetadataEditor';
import { generateFrontmatter } from '@/lib/markdown/parser';

const INITIAL_CONTENT = `# Specification Title

## Overview

Provide a brief overview of this specification.

## Goals

- Goal 1
- Goal 2

## Non-Goals

- Non-goal 1

## Detailed Design

Describe the detailed design here.

## Open Questions

- Question 1?
`;

// Build a flat indented list of folder options for a <select>
function buildFolderOptions(
    folders: SpecFolder[],
    parentId: string | null = null,
    depth = 0
): { id: string; label: string }[] {
    const result: { id: string; label: string }[] = [];
    const children = folders.filter((f) => f.parent_folder_id === parentId);
    for (const f of children) {
        result.push({ id: f.id, label: `${'\u00a0\u00a0\u00a0\u00a0'.repeat(depth)}📁 ${f.name}` });
        result.push(...buildFolderOptions(folders, f.id, depth + 1));
    }
    return result;
}

export default function NewSpecPage() {
    const params = useParams();
    const orgSlug = params.orgSlug as string;
    const projectSlug = params.projectSlug as string;

    // Core Spec Data
    const [name, setName] = useState('');
    const [specSlug, setSpecSlug] = useState('');
    const [content, setContent] = useState(INITIAL_CONTENT);

    // Metadata State
    const [status, setStatus] = useState<Status>('planned');
    const [maturity, setMaturity] = useState<Maturity>('draft');
    const [progress, setProgress] = useState(0);
    const [tagsInput, setTagsInput] = useState('');
    const [includeFrontmatter, setIncludeFrontmatter] = useState(true);
    const [showFrontmatter, setShowFrontmatter] = useState(false);

    // Folder
    const [folders, setFolders] = useState<SpecFolder[]>([]);
    const [folderId, setFolderId] = useState<string>('');

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [resolving, setResolving] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    // Generate Frontmatter for Preview and Submission
    const frontmatter = useMemo(() => {
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        return generateFrontmatter({
            progress,
            status,
            maturity,
            tags: tags.length > 0 ? tags : undefined
        });
    }, [progress, status, maturity, tagsInput]);

    useEffect(() => {
        if (name) {
            setSpecSlug(slugify(name));
        }
    }, [name]);

    // Resolve org and project by slug
    useEffect(() => {
        async function resolveProject() {
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
                    router.replace(`/${orgById.slug}/${projectSlug}/new`);
                    return;
                } else {
                    router.push('/dashboard');
                    return;
                }
            }

            // Resolve project
            const { data: projectBySlug } = await supabase
                .from('projects')
                .select('id, slug')
                .eq('slug', projectSlug)
                .eq('org_id', orgId)
                .single();

            if (projectBySlug) {
                setProjectId(projectBySlug.id);
                // Fetch folders for this project
                const { data: projectFolders } = await supabase
                    .from('spec_folders')
                    .select('id, project_id, parent_folder_id, name, slug, created_at, updated_at')
                    .eq('project_id', projectBySlug.id)
                    .order('name', { ascending: true });
                setFolders((projectFolders as SpecFolder[]) ?? []);
            } else {
                const { data: projectById } = await supabase
                    .from('projects')
                    .select('id, slug')
                    .eq('id', projectSlug)
                    .eq('org_id', orgId)
                    .single();

                if (projectById) {
                    router.replace(`/${orgSlug}/${projectById.slug}/new`);
                    return;
                } else {
                    router.push(`/${orgSlug}`);
                    return;
                }
            }

            setResolving(false);
        }
        resolveProject();
    }, [supabase, orgSlug, projectSlug, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!projectId) return;

        setLoading(true);
        setError(null);

        try {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
            const tagsJson = tags.length > 0 ? JSON.stringify(tags) : '';

            const formData = new FormData();
            formData.append('projectId', projectId);
            formData.append('name', name);
            formData.append('slug', specSlug);
            formData.append('content', content);
            if (includeFrontmatter) {
                formData.append('frontmatter', frontmatter);
            }
            formData.append('orgSlug', orgSlug);
            formData.append('projectSlug', projectSlug);
            if (folderId) formData.append('folderId', folderId);

            formData.append('progress', progress.toString());
            formData.append('status', status);
            formData.append('maturity', maturity);
            if (tagsJson) formData.append('tags', tagsJson);

            // Import dynamically to avoid cycle if needed, but here it's fine
            const { createSpec } = await import('@/app/actions/spec');
            const result = await createSpec(formData);

            if (result.error) {
                setError(result.error);
                setLoading(false);
            } else if (result.success && result.path) {
                // Successful creation
                router.push(result.path);
                // We don't set loading(false) here to prevent the button from flashing enabled 
                // while the new page loads.
            } else {
                setError('Unexpected response from server');
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            setLoading(false);
        }
    }

    if (resolving) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="mb-6">
                    <Link
                        href={`/${orgSlug}/${projectSlug}`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm"
                    >
                        ← Back to project
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Create Specification
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                    Define the metadata and content for your new specification.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Basic Info Section */}
                    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-4">
                            Basic Information
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Specification Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="e.g. API Authentication"
                                />
                            </div>

                            <div>
                                <label htmlFor="slug" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    URL Slug
                                </label>
                                <input
                                    id="slug"
                                    type="text"
                                    value={specSlug}
                                    onChange={(e) => setSpecSlug(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="e.g. api-authentication"
                                />
                            </div>
                        </div>

                        {/* Folder selector — only shown when folders exist */}
                        {folders.length > 0 && (
                            <div>
                                <label htmlFor="folder" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Folder <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <select
                                    id="folder"
                                    value={folderId}
                                    onChange={(e) => setFolderId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="">No folder (root level)</option>
                                    {buildFolderOptions(folders).map(({ id, label }) => (
                                        <option key={id} value={id}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Metadata Section */}
                    {includeFrontmatter && (
                        <SpecMetadataEditor
                            status={status}
                            setStatus={setStatus}
                            maturity={maturity}
                            setMaturity={setMaturity}
                            progress={progress}
                            setProgress={setProgress}
                            tagsInput={tagsInput}
                            setTagsInput={setTagsInput}
                        />
                    )}

                    {/* Content Section with Merged Preview */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Spec Content
                            </label>

                            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={includeFrontmatter}
                                    onChange={(e) => setIncludeFrontmatter(e.target.checked)}
                                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-800"
                                />
                                Generate Frontmatter
                            </label>
                        </div>

                        <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800/50 shadow-sm">
                            {/* Read-only Frontmatter Preview */}
                            {includeFrontmatter && (
                                <div className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 p-4 select-none transition-all">
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => setShowFrontmatter(!showFrontmatter)}
                                    >
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                            Frontmatter (Auto-generated)
                                            <svg
                                                className={`w-4 h-4 transition-transform duration-200 ${showFrontmatter ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </span>
                                    </div>
                                    {showFrontmatter && (
                                        <pre className="mt-3 p-3 bg-white/50 dark:bg-black/40 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap overflow-x-auto">
                                            {frontmatter}
                                        </pre>
                                    )}
                                </div>
                            )}

                            {/* Main Editor */}
                            <textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                                rows={20}
                                className="w-full px-4 py-4 bg-transparent focus:outline-none resize-y font-mono text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400"
                                placeholder="Write your markdown content here..."
                            />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            If enabled, the metadata above will be injected as YAML frontmatter at the top of your markdown document. You can safely disable this if your content already contains frontmatter.
                        </p>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white font-medium rounded-lg transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        >
                            {loading ? 'Creating...' : 'Create Specification'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
