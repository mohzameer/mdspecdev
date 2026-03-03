'use client';

import { useState, useTransition } from 'react';
import { SpecFolder } from '@/lib/types';

interface FolderPickerModalProps {
    folders: SpecFolder[]; // flat list, will be used to build tree display
    currentFolderId?: string | null;
    onConfirm: (folderId: string | null) => void;
    onClose: () => void;
    title?: string;
}

/**
 * Build an indented flat list of folders for easy tree display.
 * Returns items in depth-first order with a `depth` field.
 */
function flattenFolderTree(
    folders: SpecFolder[],
    parentId: string | null = null,
    depth = 0
): (SpecFolder & { depth: number })[] {
    const result: (SpecFolder & { depth: number })[] = [];
    const children = folders.filter((f) => f.parent_folder_id === parentId);
    for (const child of children) {
        result.push({ ...child, depth });
        result.push(...flattenFolderTree(folders, child.id, depth + 1));
    }
    return result;
}

export function FolderPickerModal({
    folders,
    currentFolderId,
    onConfirm,
    onClose,
    title = 'Move to Folder',
}: FolderPickerModalProps) {
    const [selected, setSelected] = useState<string | null>(currentFolderId ?? null);
    const [isPending, startTransition] = useTransition();

    const tree = flattenFolderTree(folders);

    function handleConfirm() {
        startTransition(() => {
            onConfirm(selected);
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Folder list */}
                <div className="px-3 py-3 max-h-72 overflow-y-auto space-y-0.5">
                    {/* Root option */}
                    <button
                        onClick={() => setSelected(null)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${selected === null
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        <span className="text-base">🏠</span>
                        <span className="font-medium">Root (no folder)</span>
                    </button>

                    {tree.map((folder) => (
                        <button
                            key={folder.id}
                            onClick={() => setSelected(folder.id)}
                            style={{ paddingLeft: `${12 + folder.depth * 20}px` }}
                            className={`w-full flex items-center gap-2.5 pr-3 py-2 rounded-lg text-sm transition-colors text-left ${selected === folder.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="text-base shrink-0">📁</span>
                            <span className="truncate">{folder.name}</span>
                        </button>
                    ))}

                    {tree.length === 0 && (
                        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                            No folders yet. Create one from the project page.
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isPending}
                        className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                        {isPending ? 'Moving…' : 'Move here'}
                    </button>
                </div>
            </div>
        </div>
    );
}
