'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLinkedSpec } from '@/app/actions/spec';

interface LinkSpecModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetProjectId: string;
    targetOrgSlug: string;
    targetProjectSlug: string;
}

export function LinkSpecModal({ isOpen, onClose, targetProjectId, targetOrgSlug, targetProjectSlug }: LinkSpecModalProps) {
    const router = useRouter();
    const [sourceSpecUrl, setSourceSpecUrl] = useState('');
    const [newName, setNewName] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAutoSlug = (name: string) => {
        setNewName(name);
        setNewSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Very rudimentary URL parsing to extract the spec ID or slug
            // Expected URL format: https://domain/[org]/[project]/[specSlug] or just the spec ID if we change it later
            // Since our system uses slugs for URLs but IDs for backend, let's just ask for the URL
            // and try to parse the slugs to find the actual spec ID on the server?
            // Actually, for simplicity right now, let's just assume the user pastes the URL
            // and we parse the slugs: /orgSlug/projectSlug/specSlug
            let parsedSpecSlug = '';
            try {
                const url = new URL(sourceSpecUrl);
                const pathParts = url.pathname.split('/').filter(Boolean);
                // Assume the last part is the spec slug
                if (pathParts.length >= 3) {
                    parsedSpecSlug = pathParts[pathParts.length - 1];
                } else {
                    setError("Invalid URL format. Please paste the full URL to the spec.");
                    return;
                }
            } catch (e) {
                // Not a valid URL, maybe they just pasted the slug?
                parsedSpecSlug = sourceSpecUrl;
            }

            // We actually need the sourceSpecId for the backend action.
            // Let's create a specialized action for this or modify createLinkedSpec to take slugs.
            // For now, let's assume we need to fetch the ID first before submitting.
            const res = await fetch(`/api/public/specs/${parsedSpecSlug}`);
            const data = await res.json();

            if (!data || !data.spec || !data.spec.id) {
                setError("Could not find the source specification. Ensure it's public or you have access.");
                return;
            }

            const sourceSpecId = data.spec.id;

            const formData = new FormData();
            formData.append('sourceSpecId', sourceSpecId);
            formData.append('targetProjectId', targetProjectId);
            formData.append('newName', newName);
            formData.append('newSlug', newSlug);
            formData.append('targetOrgSlug', targetOrgSlug);
            formData.append('targetProjectSlug', targetProjectSlug);

            const result = await createLinkedSpec(formData);

            if (result.error) {
                setError(result.error);
            } else {
                onClose();
                router.push(result.path!);
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Link Existing Specification</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-100 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="sourceUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Source Specification URL
                            </label>
                            <input
                                type="text"
                                id="sourceUrl"
                                value={sourceSpecUrl}
                                onChange={(e) => setSourceSpecUrl(e.target.value)}
                                placeholder="https://mdspec.com/org/project/spec-slug"
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
                                required
                                disabled={loading}
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Paste the URL of the specification you want to link.
                            </p>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Name in this project
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={newName}
                                onChange={(e) => handleAutoSlug(e.target.value)}
                                placeholder="e.g. Shared Authentication API"
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="slug" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                URL Slug
                            </label>
                            <input
                                type="text"
                                id="slug"
                                value={newSlug}
                                onChange={(e) => setNewSlug(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm font-mono"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !sourceSpecUrl || !newName || !newSlug}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center font-medium"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Link Spec'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
