'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { LinkSpecModal } from '@/components/dashboard/LinkSpecModal';
import { createFolder } from '@/app/actions/folders';

interface ProjectHeaderActionsProps {
    orgSlug: string;
    projectSlug: string;
    projectId: string;
}

export function ProjectHeaderActions({ orgSlug, projectSlug, projectId }: ProjectHeaderActionsProps) {
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [folderError, setFolderError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleCreateFolder() {
        if (!folderName.trim()) return;
        setFolderError(null);
        startTransition(async () => {
            const result = await createFolder(projectId, folderName.trim(), null, orgSlug, projectSlug);
            if (result.error) {
                setFolderError(result.error);
            } else {
                setFolderName('');
                setShowNewFolder(false);
            }
        });
    }

    return (
        <div className="flex items-center gap-3 flex-wrap justify-end">
            {/* Inline new-folder form */}
            {showNewFolder && (
                <div className="flex items-center gap-2">
                    <input
                        autoFocus
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateFolder();
                            if (e.key === 'Escape') { setShowNewFolder(false); setFolderName(''); }
                        }}
                        placeholder="Folder name…"
                        className="text-sm rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 w-44"
                    />
                    <button
                        onClick={handleCreateFolder}
                        disabled={isPending || !folderName.trim()}
                        className="px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                        {isPending ? '…' : 'Create'}
                    </button>
                    <button
                        onClick={() => { setShowNewFolder(false); setFolderName(''); setFolderError(null); }}
                        className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-white"
                    >
                        Cancel
                    </button>
                    {folderError && (
                        <span className="text-xs text-red-500">{folderError}</span>
                    )}
                </div>
            )}

            {!showNewFolder && (
                <button
                    onClick={() => setShowNewFolder(true)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                    <span>📁</span>
                    New Folder
                </button>
            )}

            <button
                onClick={() => setIsLinkModalOpen(true)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Link Spec
            </button>
            <Link
                href={`/${orgSlug}/${projectSlug}/new`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
                New Spec
            </Link>

            <LinkSpecModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                targetProjectId={projectId}
                targetOrgSlug={orgSlug}
                targetProjectSlug={projectSlug}
            />
        </div>
    );
}
