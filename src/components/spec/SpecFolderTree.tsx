'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { SpecFolder } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import { FolderPickerModal } from './FolderPickerModal';
import { deleteFolder, renameFolder, createFolder, moveFolderToFolder } from '@/app/actions/folders';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

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

interface SpecFolderTreeProps {
    folder: SpecFolder & { depth?: number };
    allFolders: SpecFolder[];
    specs: SpecCardData[];
    orgSlug: string;
    projectSlug: string;
    projectId: string;
    selectedSpecIds: Set<string>;
    onToggleSpec: (id: string) => void;
}

// Status colour dot helper
function StatusDot({ status }: { status: string | null }) {
    const colours: Record<string, string> = {
        'planned': 'bg-slate-400',
        'in-progress': 'bg-blue-500',
        'completed': 'bg-green-500',
    };
    const cls = status ? (colours[status] ?? 'bg-slate-400') : 'bg-slate-300';
    return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cls}`} title={status ?? 'No status'} />;
}

export function SpecCard({
    spec,
    orgSlug,
    projectSlug,
    allFolders,
    isSelected,
    onToggle,
    onMoved,
}: {
    spec: SpecCardData;
    orgSlug: string;
    projectSlug: string;
    allFolders: SpecFolder[];
    isSelected: boolean;
    onToggle: () => void;
    onMoved?: () => void;
}) {
    const [showPicker, setShowPicker] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const unresolvedCount = spec.comment_threads?.filter((t) => !t.resolved).length ?? 0;
    const isLinked = !!spec.source_spec_id;

    function handleMove(folderId: string | null) {
        startTransition(async () => {
            const { moveSpecsToFolder } = await import('@/app/actions/folders');
            const result = await moveSpecsToFolder([spec.id], folderId, orgSlug, projectSlug);
            if (result.error) {
                setError(result.error);
            }
            setShowPicker(false);
            onMoved?.();
        });
    }

    return (
        <>
            <div
                className={`relative group flex flex-col items-center gap-2 p-4 rounded-xl border cursor-pointer transition-all duration-150 select-none ${isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
            >
                {/* Checkbox — top-left, shown on hover or when selected */}
                <div className={`absolute top-2 left-2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggle}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-blue-600 cursor-pointer"
                        aria-label={`Select ${spec.name}`}
                    />
                </div>

                {/* Overflow menu — top-right */}
                <div className={`absolute top-2 right-2 transition-opacity ${isSelected ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="relative">
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o); }}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            aria-label="Spec options"
                        >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-20">
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setShowPicker(true); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <span>📁</span>
                                    Move to Folder…
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* File icon — links to spec */}
                <Link
                    href={`/${orgSlug}/${projectSlug}/${spec.slug}`}
                    className="flex flex-col items-center gap-2 w-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Document SVG icon */}
                    <div className="relative mt-1">
                        <svg
                            className={`w-14 h-14 transition-colors ${isLinked
                                ? 'text-blue-300 dark:text-blue-600'
                                : 'text-slate-200 dark:text-slate-600 group-hover:text-blue-100 dark:group-hover:text-blue-900/60'
                                }`}
                            viewBox="0 0 56 68"
                            fill="currentColor"
                        >
                            {/* Page body */}
                            <rect x="0" y="0" width="56" height="68" rx="5" />
                            {/* Folded corner */}
                            <path d="M40 0 L56 16 L40 16 Z" fill="white" fillOpacity="0.25" />
                        </svg>
                        {/* Status dot */}
                        <span className="absolute bottom-1 right-1">
                            <StatusDot status={spec.status} />
                        </span>
                        {/* Linked badge */}
                        {isLinked && (
                            <span className="absolute top-0 left-0 text-[10px] bg-blue-500 text-white rounded-sm px-1 leading-tight font-medium">
                                linked
                            </span>
                        )}
                    </div>

                    {/* Spec name */}
                    <p className="text-center text-sm font-medium text-slate-800 dark:text-white leading-tight line-clamp-2 px-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors w-full">
                        {spec.name}
                    </p>
                </Link>

                {/* Minimal metadata row */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-auto">
                    {unresolvedCount > 0 && (
                        <span className="text-orange-500 dark:text-orange-400 font-medium">💬 {unresolvedCount}</span>
                    )}
                    {unresolvedCount > 0 && <span>·</span>}
                    <span>{formatRelativeTime(spec.updated_at)}</span>
                </div>
            </div>

            {error && (
                <p className="text-xs text-red-500 mt-1 px-1">{error}</p>
            )}

            {showPicker && (
                <FolderPickerModal
                    folders={allFolders}
                    currentFolderId={spec.folder_id}
                    onConfirm={handleMove}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </>
    );
}


// ──────────────────────────────────────────────
// SpecFolderTree (recursive)
// ──────────────────────────────────────────────

export function SpecFolderTree({
    folder,
    allFolders,
    specs,
    orgSlug,
    projectSlug,
    projectId,
    selectedSpecIds,
    onToggleSpec,
}: SpecFolderTreeProps) {
    const [open, setOpen] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(folder.name);
    const [showMoverFolder, setShowMoverFolder] = useState(false);
    const [showCreateSub, setShowCreateSub] = useState(false);
    const [newSubName, setNewSubName] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const folderSpecs = specs.filter((s) => s.folder_id === folder.id);
    const childFolders = allFolders.filter((f) => f.parent_folder_id === folder.id);
    const totalCount = folderSpecs.length + childFolders.length;
    const depth = folder.depth ?? 0;

    function handleRename() {
        if (!editName.trim() || editName === folder.name) {
            setEditing(false);
            return;
        }
        startTransition(async () => {
            const result = await renameFolder(folder.id, editName.trim(), orgSlug, projectSlug);
            if (result.error) setError(result.error);
            setEditing(false);
        });
    }

    function handleDelete() {
        setMenuOpen(false);
        startTransition(async () => {
            const result = await deleteFolder(folder.id, orgSlug, projectSlug);
            if (result.error) setError(result.error);
        });
    }

    function handleCreateSub() {
        if (!newSubName.trim()) return;
        startTransition(async () => {
            const result = await createFolder(projectId, newSubName.trim(), folder.id, orgSlug, projectSlug);
            if (result.error) setError(result.error);
            setNewSubName('');
            setShowCreateSub(false);
        });
    }

    function handleMoveFolder(newParentId: string | null) {
        startTransition(async () => {
            const result = await moveFolderToFolder(folder.id, newParentId, orgSlug, projectSlug);
            if (result.error) setError(result.error);
            setShowMoverFolder(false);
        });
    }

    return (
        <div className={depth > 0 ? 'ml-4 border-l border-slate-200 dark:border-slate-700 pl-4' : ''}>
            {/* Folder header */}
            <div className="flex items-center gap-2 py-2 group/folder">
                <button
                    onClick={() => setOpen((o) => !o)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    aria-label={open ? 'Collapse folder' : 'Expand folder'}
                >
                    <svg
                        className={`w-4 h-4 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <span className="text-lg select-none">📁</span>

                {editing ? (
                    <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename();
                            if (e.key === 'Escape') { setEditName(folder.name); setEditing(false); }
                        }}
                        className="flex-1 text-sm font-semibold bg-transparent border-b border-blue-500 outline-none text-slate-900 dark:text-white"
                    />
                ) : (
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex-1">
                        {folder.name}
                        <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">
                            ({totalCount})
                        </span>
                    </span>
                )}

                {/* Folder overflow menu */}
                <div className="relative opacity-0 group-hover/folder:opacity-100 transition-opacity">
                    <button
                        onClick={() => setMenuOpen((o) => !o)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Folder options"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-20">
                            <button
                                onClick={() => { setMenuOpen(false); setEditing(true); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                ✏️ Rename
                            </button>
                            <button
                                onClick={() => { setMenuOpen(false); setShowCreateSub(true); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                📁 New Sub-folder
                            </button>
                            <button
                                onClick={() => { setMenuOpen(false); setShowMoverFolder(true); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                📦 Move to…
                            </button>
                            <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                            <button
                                onClick={handleDelete}
                                disabled={isPending}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            >
                                🗑 Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <p className="text-xs text-red-500 ml-8 mb-1">{error}</p>
            )}

            {/* New sub-folder inline form */}
            {showCreateSub && (
                <div className="ml-8 mb-3 flex items-center gap-2">
                    <span className="text-base">📁</span>
                    <input
                        autoFocus
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateSub();
                            if (e.key === 'Escape') { setShowCreateSub(false); setNewSubName(''); }
                        }}
                        placeholder="Sub-folder name…"
                        className="flex-1 text-sm rounded-lg px-3 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleCreateSub}
                        disabled={isPending || !newSubName.trim()}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                        Create
                    </button>
                    <button
                        onClick={() => { setShowCreateSub(false); setNewSubName(''); }}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-white"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Expanded content */}
            {open && (
                <div className="ml-6">
                    {/* Child folders (recursive) */}
                    {childFolders.map((child) => (
                        <SpecFolderTree
                            key={child.id}
                            folder={{ ...child, depth: depth + 1 }}
                            allFolders={allFolders}
                            specs={specs}
                            orgSlug={orgSlug}
                            projectSlug={projectSlug}
                            projectId={projectId}
                            selectedSpecIds={selectedSpecIds}
                            onToggleSpec={onToggleSpec}
                        />
                    ))}

                    {/* Specs in this folder */}
                    {folderSpecs.length > 0 ? (
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 py-3">
                            {folderSpecs.map((spec) => (
                                <SpecCard
                                    key={spec.id}
                                    spec={spec}
                                    orgSlug={orgSlug}
                                    projectSlug={projectSlug}
                                    allFolders={allFolders}
                                    isSelected={selectedSpecIds.has(spec.id)}
                                    onToggle={() => onToggleSpec(spec.id)}
                                />
                            ))}
                        </div>
                    ) : childFolders.length === 0 ? (
                        <p className="text-sm text-slate-400 dark:text-slate-500 py-3 ml-1">
                            This folder is empty.
                        </p>
                    ) : null}
                </div>
            )}

            {/* Folder picker modal (move folder) */}
            {showMoverFolder && (
                <FolderPickerModal
                    folders={allFolders.filter((f) => f.id !== folder.id)}
                    currentFolderId={folder.parent_folder_id}
                    onConfirm={handleMoveFolder}
                    onClose={() => setShowMoverFolder(false)}
                    title="Move Folder to…"
                />
            )}
        </div>
    );
}
