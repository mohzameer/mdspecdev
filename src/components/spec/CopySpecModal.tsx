'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';

interface Project {
    id: string;
    name: string;
    slug: string;
    org_id: string;
    org_name: string;
    org_slug: string;
}

interface CopySpecModalProps {
    specId: string;
    specName: string;
    onClose: () => void;
}

export function CopySpecModal({ specId, specName, onClose }: CopySpecModalProps) {
    const router = useRouter();
    const supabase = createClient();

    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [newName, setNewName] = useState(specName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const newSlug = useMemo(() => slugify(newName), [newName]);

    // Fetch all projects the user has access to across all orgs
    useEffect(() => {
        async function loadProjects() {
            setLoadingProjects(true);
            // Get membership orgs
            const { data: memberships } = await supabase
                .from('org_memberships')
                .select('org_id, organizations(id, name, slug)');

            if (!memberships || memberships.length === 0) {
                setLoadingProjects(false);
                return;
            }

            const orgIds = memberships.map((m) => m.org_id);

            const { data: projectRows } = await supabase
                .from('projects')
                .select('id, name, slug, org_id')
                .in('org_id', orgIds)
                .order('name');

            if (!projectRows) {
                setLoadingProjects(false);
                return;
            }

            // Build a lookup from org_id to org details
            const orgMap = new Map<string, { name: string; slug: string }>();
            for (const m of memberships) {
                const org = m.organizations as any;
                if (org) orgMap.set(m.org_id, { name: org.name, slug: org.slug });
            }

            const mapped: Project[] = projectRows.map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                org_id: p.org_id,
                org_name: orgMap.get(p.org_id)?.name ?? '',
                org_slug: orgMap.get(p.org_id)?.slug ?? '',
            }));

            setProjects(mapped);
            if (mapped.length > 0) setSelectedProjectId(mapped[0].id);
            setLoadingProjects(false);
        }

        loadProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedProject = projects.find((p) => p.id === selectedProjectId);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedProject || !newName.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('sourceSpecId', specId);
            formData.append('targetProjectId', selectedProject.id);
            formData.append('newName', newName.trim());
            formData.append('newSlug', newSlug);
            formData.append('targetOrgSlug', selectedProject.org_slug);
            formData.append('targetProjectSlug', selectedProject.slug);

            const { copySpec } = await import('@/app/actions/spec');
            const result = await copySpec(formData);

            if (result.error) {
                setError(result.error);
                setLoading(false);
            } else if (result.success && result.path) {
                router.push(result.path);
                onClose();
            } else {
                setError('Unexpected response from server');
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            setLoading(false);
        }
    }

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Duplicate Spec to Project</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Target Project */}
                    <div>
                        <label htmlFor="copy-target-project" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Target Project
                        </label>
                        {loadingProjects ? (
                            <div className="h-10 bg-slate-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
                        ) : projects.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No projects available.</p>
                        ) : (
                            <select
                                id="copy-target-project"
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.org_name} / {p.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* New Spec Name */}
                    <div>
                        <label htmlFor="copy-spec-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Spec Name
                        </label>
                        <input
                            id="copy-spec-name"
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="e.g. API Authentication"
                        />
                    </div>

                    {/* URL Slug (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            URL Slug <span className="text-slate-400 font-normal">(auto-generated)</span>
                        </label>
                        <div className="px-3 py-2.5 bg-slate-100 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 text-sm font-mono select-all">
                            {newSlug || '—'}
                        </div>
                    </div>

                    {/* Info note */}
                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                        The spec's content, status, maturity, progress, and tags will be copied. Comments will <strong>not</strong> be copied. You become the owner of the copy.
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white text-sm font-medium rounded-lg transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || loadingProjects || !selectedProjectId || !newName.trim()}
                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Duplicating…
                                </>
                            ) : (
                                'Duplicate Spec'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
