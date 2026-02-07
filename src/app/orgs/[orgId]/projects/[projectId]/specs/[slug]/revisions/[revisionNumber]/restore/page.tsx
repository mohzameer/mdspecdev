'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function RestoreRevisionPage() {
    const params = useParams();
    const orgId = params.orgId as string;
    const projectId = params.projectId as string;
    const slug = params.slug as string;
    const revisionNumber = parseInt(params.revisionNumber as string);

    const [spec, setSpec] = useState<any>(null);
    const [revision, setRevision] = useState<any>(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        async function loadData() {
            try {
                const { data: specData } = await supabase
                    .from('specs')
                    .select(
                        `
            id,
            name,
            revisions(revision_number, content_key)
          `
                    )
                    .eq('project_id', projectId)
                    .eq('slug', slug)
                    .is('archived_at', null)
                    .single();

                if (!specData) {
                    router.push(`/orgs/${orgId}/projects/${projectId}`);
                    return;
                }

                setSpec(specData);

                const rev = (specData.revisions as any[])?.find(
                    (r) => r.revision_number === revisionNumber
                );

                if (!rev) {
                    router.push(
                        `/orgs/${orgId}/projects/${projectId}/specs/${slug}/revisions`
                    );
                    return;
                }

                setRevision(rev);

                const { data } = await supabase.storage
                    .from('spec-content')
                    .download(rev.content_key);

                if (data) {
                    setContent(await data.text());
                }

                setLoading(false);
            } catch (err) {
                console.error(err);
                setError('Failed to load revision');
                setLoading(false);
            }
        }

        loadData();
    }, [supabase, projectId, slug, revisionNumber, orgId, router]);

    async function handleRestore() {
        setRestoring(true);
        setError(null);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setError('You must be logged in');
                setRestoring(false);
                return;
            }

            const allRevisions = (spec.revisions as any[])?.sort(
                (a: any, b: any) => b.revision_number - a.revision_number
            );
            const newRevisionNumber = (allRevisions?.[0]?.revision_number || 0) + 1;

            const contentPath = `specs/${spec.id}/${newRevisionNumber}.md`;

            const { error: uploadError } = await supabase.storage
                .from('spec-content')
                .upload(contentPath, content, { contentType: 'text/markdown' });

            if (uploadError) {
                setError(`Failed to upload content: ${uploadError.message}`);
                setRestoring(false);
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
                revision_number: newRevisionNumber,
                content_key: contentPath,
                content_hash: contentHash,
                summary: `Restored from v${revisionNumber}`,
                author_id: user.id,
            });

            if (revisionError) {
                setError(revisionError.message);
                setRestoring(false);
                return;
            }

            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (frontmatterMatch) {
                const yaml = frontmatterMatch[1];
                const metadata: Record<string, any> = {};
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

                await supabase
                    .from('specs')
                    .update({
                        progress,
                        status: metadata.status ?? null,
                        maturity: metadata.maturity ?? null,
                        tags,
                    })
                    .eq('id', spec.id);
            }

            router.push(`/orgs/${orgId}/projects/${projectId}/specs/${slug}`);
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            setRestoring(false);
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
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="mb-4">
                    <Link
                        href={`/orgs/${orgId}/projects/${projectId}/specs/${slug}/revisions/${revisionNumber}`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm"
                    >
                        ← Back to revision
                    </Link>
                </div>

                <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-8 shadow-sm">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/20 mb-4">
                            <span className="text-3xl">↩️</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            Restore v{revisionNumber}?
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                            This will create a new revision (v
                            {(spec?.revisions?.length || 0) + 1}) with the content from v
                            {revisionNumber}. The current version will remain in history.
                        </p>

                        {error && (
                            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm mb-6">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white font-medium rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRestore}
                                disabled={restoring}
                                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                            >
                                {restoring ? 'Restoring...' : 'Restore This Version'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
