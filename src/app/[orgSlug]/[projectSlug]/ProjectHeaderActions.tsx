'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LinkSpecModal } from '@/components/dashboard/LinkSpecModal';

interface ProjectHeaderActionsProps {
    orgSlug: string;
    projectSlug: string;
    projectId: string;
}

export function ProjectHeaderActions({ orgSlug, projectSlug, projectId }: ProjectHeaderActionsProps) {
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    return (
        <div className="flex items-center gap-3">
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
