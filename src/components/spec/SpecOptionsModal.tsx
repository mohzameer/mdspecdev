import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Link from 'next/link';
import { SpecInfo } from '@/components/spec/SpecViewer';
import { StatusBadge, MaturityBadge, TagsList } from '@/components/spec/StatusBadge';
import { ProgressBar } from '@/components/spec/ProgressBar';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { SpecFolder } from '@/lib/types';

interface SpecOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    spec: SpecInfo;
    orgSlug: string;
    projectSlug: string;
    revisionCount: number;
    isOwner: boolean;
    isPublicView: boolean;
    isLinked: boolean;
    foldersLength: number;

    // Actions
    isSharing: boolean;
    onTogglePublic: () => void;

    onMoveToFolder: () => void;
    onDuplicate: () => void;

    isGeneratingPdf: boolean;
    onExportPdf: () => void;

    isCopied: boolean;
    onCopyMarkdown: () => void;

    isUnlinking: boolean;
    onUnlink: () => void;

    isDeleting: boolean;
    onDelete: () => void;

}

export function SpecOptionsModal({
    isOpen,
    onClose,
    spec,
    orgSlug,
    projectSlug,
    revisionCount,
    isOwner,
    isPublicView,
    isLinked,
    foldersLength,
    isSharing,
    onTogglePublic,
    onMoveToFolder,
    onDuplicate,
    isGeneratingPdf,
    onExportPdf,
    isCopied,
    onCopyMarkdown,
    isUnlinking,
    onUnlink,
    isDeleting,
    onDelete,
}: SpecOptionsModalProps) {
    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-2xl border border-slate-200 dark:border-slate-800">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white dark:bg-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800">
                                    <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-slate-900 dark:text-white">
                                        Specification Details
                                    </Dialog.Title>
                                    <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                        {spec.file_name && <span className="font-mono">{spec.file_name}</span>}
                                    </div>
                                </div>

                                <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Metadata */}
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Status & Progress</h4>
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <StatusBadge status={spec.status} />
                                                    <MaturityBadge maturity={spec.maturity} />
                                                </div>
                                                <TagsList tags={spec.tags} max={10} />
                                                {spec.progress !== null && (
                                                    <div className="mt-2 text-sm">
                                                        <ProgressBar progress={spec.progress} showLabel={true} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Details</h4>
                                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                                <div className="flex justify-between">
                                                    <span>Owner</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">@{spec.owner?.full_name || 'Unknown'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Created</span>
                                                    <span>{formatDate(spec.created_at)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Updated</span>
                                                    <span>{formatRelativeTime(spec.updated_at)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span>Revisions</span>
                                                    <Link
                                                        href={`/${orgSlug}/${projectSlug}/${spec.slug}/revisions`}
                                                        className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                                                        onClick={onClose}
                                                    >
                                                        {revisionCount} &rarr;
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Actions */}
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Actions</h4>
                                        <div className="space-y-1">
                                            {/* Share / Public toggle */}
                                            {isOwner && !isPublicView && (
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 mb-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-slate-900 dark:text-white">Visibility</span>
                                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${spec.is_public ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                            {spec.is_public ? 'Public' : 'Private'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={onTogglePublic}
                                                        disabled={isSharing}
                                                        className="w-full justify-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        {isSharing ? (
                                                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            spec.is_public ? 'Make Private' : 'Make Public'
                                                        )}
                                                    </button>
                                                </div>
                                            )}


                                            {/* Move to Folder */}
                                            {!isPublicView && !isLinked && foldersLength > 0 && (
                                                <button
                                                    onClick={onMoveToFolder}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-3 group transition-colors"
                                                >
                                                    <svg className="w-5 h-5 text-slate-400 group-hover:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                    </svg>
                                                    Move to Folder...
                                                </button>
                                            )}

                                            {/* Duplicate */}
                                            {!isPublicView && (
                                                <button
                                                    onClick={onDuplicate}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-3 group transition-colors"
                                                >
                                                    <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    Duplicate
                                                </button>
                                            )}

                                            {/* Export PDF */}
                                            <button
                                                onClick={onExportPdf}
                                                disabled={isGeneratingPdf}
                                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-3 group transition-colors"
                                            >
                                                {isGeneratingPdf ? (
                                                    <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-5 h-5 text-slate-400 group-hover:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                )}
                                                Export PDF
                                            </button>

                                            {/* Copy Markdown */}
                                            <button
                                                onClick={onCopyMarkdown}
                                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-3 group transition-colors"
                                            >
                                                {isCopied ? (
                                                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                )}
                                                {isCopied ? 'Copied!' : 'Copy Markdown'}
                                            </button>

                                            {/* Unlink */}
                                            {isLinked && !isPublicView && (
                                                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                                                    <button
                                                        onClick={onUnlink}
                                                        disabled={isUnlinking}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-3 transition-colors"
                                                    >
                                                        {isUnlinking ? (
                                                            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                            </svg>
                                                        )}
                                                        Remove Link
                                                    </button>
                                                </div>
                                            )}

                                            {/* Delete */}
                                            {isOwner && !isLinked && !isPublicView && (
                                                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                                                    <button
                                                        onClick={onDelete}
                                                        disabled={isDeleting}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-3 transition-colors"
                                                    >
                                                        {isDeleting ? (
                                                            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        )}
                                                        Delete Specification
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
