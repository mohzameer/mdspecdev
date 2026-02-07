'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { slugify } from '@/lib/utils';

const DEFAULT_CONTENT = `---
progress: 0
status: planned
maturity: draft
tags: []
---

# Specification Title

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
    const [name, setName] = useState('');
    const [specSlug, setSpecSlug] = useState('');
    const [content, setContent] = useState(DEFAULT_CONTENT);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [resolving, setResolving] = useState(true);
    const router = useRouter();
    const supabase = createClient();

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

            // Ensure tags is an array
            let tags: string[] | null = null;
            if (metadata.tags) {
                if (Array.isArray(metadata.tags)) {
                    tags = metadata.tags.filter((t: string) => t && t.trim());
                } else if (typeof metadata.tags === 'string') {
                    tags = [metadata.tags.trim()].filter(Boolean);
                }
                if (tags && tags.length === 0) tags = null;
            }

            // Validate progress
            let progress: number | null = null;
            if (metadata.progress !== undefined && metadata.progress !== null) {
                const p = Number(metadata.progress);
                if (!isNaN(p)) {
                    progress = Math.max(0, Math.min(100, p));
                }
            }

            const { data: spec, error: specError } = await supabase
                .from('specs')
                .insert({
                    project_id: projectId,
                    name,
                    slug: specSlug,
                    owner_id: user.id,
                    progress,
                    status: metadata.status || null,
                    maturity: metadata.maturity || null,
                    tags,
                })
                .select()
                .single();

            if (specError) {
                setError(specError.message);
                setLoading(false);
                return;
            }

            const contentPath = `specs/${spec.id}/1.md`;
            const { error: uploadError } = await supabase.storage
                .from('spec-content')
                .upload(contentPath, content, { contentType: 'text/markdown' });

            if (uploadError) {
                await supabase.from('specs').delete().eq('id', spec.id);
                setError(`Failed to upload content: ${uploadError.message}`);
                setLoading(false);
                return;
            }

            const encoder = new TextEncoder();
            const data = encoder.encode(content);
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
            <div className="container mx-auto px-4 py-8">
                <div className="mb-4">
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
                    Write your spec in markdown with YAML frontmatter for metadata.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
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
                                className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="API Authentication"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="slug"
                                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                            >
                                URL slug
                            </label>
                            <input
                                id="slug"
                                type="text"
                                value={specSlug}
                                onChange={(e) => setSpecSlug(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="api-authentication"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="content"
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                        >
                            Content (Markdown with YAML frontmatter)
                        </label>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            rows={20}
                            className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm resize-none"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white font-medium rounded-lg transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Specification'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
