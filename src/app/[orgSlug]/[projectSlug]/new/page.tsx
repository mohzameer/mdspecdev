'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { slugify } from '@/lib/utils';
import { Status, Maturity } from '@/lib/types';

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

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [resolving, setResolving] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    // Generate Frontmatter for Preview and Submission
    const frontmatter = useMemo(() => {
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        const tagsStr = tags.length > 0 ? `[${tags.map(t => `"${t}"`).join(', ')}]` : '[]';

        return `---
progress: ${progress}
status: ${status}
maturity: ${maturity}
tags: ${tagsStr}
---`;
    }, [progress, status, maturity, tagsInput]);

    useEffect(() => {
        if (name) {
            setSpecSlug(slugify(name));
        }
    }, [name]);

    // Resolve org and project by slug
    useEffect(() => {
        async function resolveProject() {
            // Resolve org
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
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setError('You must be logged in');
                setLoading(false);
                return;
            }

            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

            const { data: spec, error: specError } = await supabase
                .from('specs')
                .insert({
                    project_id: projectId,
                    name,
                    slug: specSlug,
                    owner_id: user.id,
                    progress,
                    status,
                    maturity,
                    tags: tags.length > 0 ? tags : null,
                })
                .select()
                .single();

            if (specError) {
                setError(specError.message);
                setLoading(false);
                return;
            }

            // Combine frontmatter and content
            const fullContent = `${frontmatter}\n\n${content}`;
            const contentPath = `specs/${spec.id}/1.md`;

            const { error: uploadError } = await supabase.storage
                .from('spec-content')
                .upload(contentPath, fullContent, { contentType: 'text/markdown' });

            if (uploadError) {
                await supabase.from('specs').delete().eq('id', spec.id);
                setError(`Failed to upload content: ${uploadError.message}`);
                setLoading(false);
                return;
            }

            const encoder = new TextEncoder();
            const data = encoder.encode(fullContent);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const contentHash = hashArray
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            const { error: revisionError } = await supabase.from('revisions').insert({
                spec_id: spec.id,
                revision_number: 1,
                content_key: contentPath,
                content_hash: contentHash,
                summary: 'Initial version',
                author_id: user.id,
            });

            if (revisionError) {
                setError(revisionError.message);
                setLoading(false);
                return;
            }

            router.push(`/${orgSlug}/${projectSlug}/${specSlug}`);
            router.refresh();
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
                    <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
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
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="e.g. api-authentication"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Metadata Section */}
                    <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-4">
                            Metadata
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Status
                                </label>
                                <select
                                    id="status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as Status)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="planned">Planned</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="maturity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Maturity
                                </label>
                                <select
                                    id="maturity"
                                    value={maturity}
                                    onChange={(e) => setMaturity(e.target.value as Maturity)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="review">In Review</option>
                                    <option value="stable">Stable</option>
                                    <option value="deprecated">Deprecated</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="tags" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Tags (comma separated)
                                </label>
                                <input
                                    id="tags"
                                    type="text"
                                    value={tagsInput}
                                    onChange={(e) => setTagsInput(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="api, security, v1"
                                />
                            </div>

                            <div>
                                <label htmlFor="progress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Progress: {progress}%
                                </label>
                                <input
                                    id="progress"
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={progress}
                                    onChange={(e) => setProgress(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section with Merged Preview */}
                    <div className="space-y-2">
                        <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Spec Content
                        </label>
                        <div className="border border-slate-300 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-white/5 shadow-sm">
                            {/* Read-only Frontmatter Preview */}
                            <div className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 p-4 select-none">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Frontmatter (Auto-generated)
                                    </span>
                                </div>
                                <pre className="font-mono text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
                                    {frontmatter}
                                </pre>
                            </div>

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
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-white font-medium rounded-lg transition-all"
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
