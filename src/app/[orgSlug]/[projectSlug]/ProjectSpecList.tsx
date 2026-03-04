'use client';

import { useState, useTransition } from 'react';
import { SpecFolder } from '@/lib/types';
import { SpecFolderTree, SpecCard } from '@/components/spec/SpecFolderTree';
import { FolderPickerModal } from '@/components/spec/FolderPickerModal';
import { moveSpecsToFolder } from '@/app/actions/folders';
import { archiveSpecs, unarchiveSpecs } from '@/app/actions/spec';

interface SpecCardData {
    id: string;
    name: string;
    slug: string;
    folder_id: string | null;
    progress: number | null;
    status: string | null;
    maturity: string | null;
    tags: string[] | null;
    updated_at: string;
    file_name: string | null;
    source_spec_id: string | null;
    owner: { full_name: string | null; avatar_url: string | null } | null;
    comment_threads: { id: string; resolved: boolean }[] | null;
    revisions: { id: string }[] | null;
}

interface ProjectSpecListProps {
    folders: SpecFolder[];
    specs: SpecCardData[];
    orgSlug: string;
    projectSlug: string;
    projectId: string;
    showArchived?: boolean;
}

/** Root-level folder IDs (parent_folder_id === null) */
function rootFolders(folders: SpecFolder[]) {
    return folders.filter((f) => f.parent_folder_id === null);
}

export function ProjectSpecList({
    folders,
    specs,
    orgSlug,
    projectSlug,
    projectId,
    showArchived = false,
}: ProjectSpecListProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showBulkPicker, setShowBulkPicker] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const rootSpecs = specs.filter((s) => s.folder_id === null);
    const rootFolderList = rootFolders(folders);

    function toggleSpec(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function clearSelection() {
        setSelected(new Set());
    }

    function handleBulkMove(folderId: string | null) {
        setBulkError(null);
        startTransition(async () => {
            const result = await moveSpecsToFolder(
                Array.from(selected),
                folderId,
                orgSlug,
                projectSlug
            );
            if (result.error) {
                setBulkError(result.error);
            } else {
                clearSelection();
            }
            setShowBulkPicker(false);
        });
    }

    function handleBulkArchive() {
        setBulkError(null);
        startTransition(async () => {
            const ids = Array.from(selected);
            const result = showArchived
                ? await unarchiveSpecs(ids, orgSlug, projectSlug)
                : await archiveSpecs(ids, orgSlug, projectSlug);
            if (result.error) {
                setBulkError(result.error);
            } else {
                clearSelection();
            }
        });
    }

    const hasSpecs = specs.length > 0;
    const hasFolders = folders.length > 0;

    return (
        <div className="space-y-2">
            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {selected.size} spec{selected.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex-1" />
                    {!showArchived && (
                        <button
                            onClick={() => setShowBulkPicker(true)}
                            className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            <span>📁</span> Move to…
                        </button>
                    )}
                    <button
                        onClick={handleBulkArchive}
                        disabled={isPending}
                        className="px-3 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        {showArchived ? '↩ Unarchive' : '🗄 Archive'}
                    </button>
                    <button
                        onClick={clearSelection}
                        className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    {bulkError && (
                        <span className="text-xs text-red-500">{bulkError}</span>
                    )}
                </div>
            )}

            {/* Folders */}
            {rootFolderList.map((folder) => (
                <SpecFolderTree
                    key={folder.id}
                    folder={folder}
                    allFolders={folders}
                    specs={specs}
                    orgSlug={orgSlug}
                    projectSlug={projectSlug}
                    projectId={projectId}
                    selectedSpecIds={selected}
                    onToggleSpec={toggleSpec}
                />
            ))}

            {/* Root-level specs */}
            {rootSpecs.length > 0 && (
                <div className={hasFolders ? 'mt-6' : ''}>
                    {hasFolders && (
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                            Ungrouped
                        </h2>
                    )}
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {rootSpecs.map((spec) => (
                            <SpecCard
                                key={spec.id}
                                spec={spec}
                                orgSlug={orgSlug}
                                projectSlug={projectSlug}
                                allFolders={folders}
                                isSelected={selected.has(spec.id)}
                                onToggle={() => toggleSpec(spec.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!hasSpecs && !hasFolders && (
                <div className="text-center py-16 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                        <span className="text-2xl">📄</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No specifications yet
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">
                        Create your first specification or folder in this project.
                    </p>
                </div>
            )}

            {/* Bulk folder picker modal */}
            {showBulkPicker && (
                <FolderPickerModal
                    folders={folders}
                    currentFolderId={null}
                    onConfirm={handleBulkMove}
                    onClose={() => setShowBulkPicker(false)}
                    title={`Move ${selected.size} spec${selected.size > 1 ? 's' : ''} to…`}
                />
            )}
        </div>
    );
}
