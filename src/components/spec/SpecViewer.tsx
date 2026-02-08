
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/spec/MarkdownRenderer';
import { CommentSidebar } from '@/components/comments/CommentSidebar';
import { ProgressBar } from '@/components/spec/ProgressBar';
import {
    StatusBadge,
    MaturityBadge,
    TagsList,
} from '@/components/spec/StatusBadge';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { Profile, Spec, Project, Organization } from '@/lib/types';

interface SpecInfo {
    id: string;
    name: string;
    slug: string;
    progress: number | null;
    status: any;
    maturity: any;
    tags: string[] | null;
    updated_at: string;
    created_at: string;
    owner: any;
}

interface SpecViewerProps {
    content: string;
    spec: SpecInfo;
    org: { slug: string; name: string };
    project: { slug: string; name: string };
    currentUser: Profile | null;
    unresolvedCount: number;
    revisionCount: number;
}

export function SpecViewer({
    content,
    spec,
    org,
    project,
    currentUser,
    unresolvedCount,
    revisionCount,
}: SpecViewerProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

    const handleCommentClick = (headingId: string) => {
        setActiveHeadingId(headingId);
        setIsSidebarOpen(true);
    };

    return (
        <div className="relative">
            {/* Header Section */}
            <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-6 mb-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            {spec.name}
                        </h1>
                        <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={spec.status} />
                            <MaturityBadge maturity={spec.maturity} />
                            <TagsList tags={spec.tags} max={5} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={`/${org.slug}/${project.slug}/${spec.slug}/revisions`}
                            className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white font-medium rounded-lg transition-colors text-sm"
                        >
                            History ({revisionCount})
                        </Link>
                        <Link
                            href={`/${org.slug}/${project.slug}/${spec.slug}/edit`}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors text-sm"
                        >
                            Edit
                        </Link>
                    </div>
                </div>

                {spec.progress !== null && (
                    <div className="mb-4">
                        <ProgressBar progress={spec.progress} showLabel={false} />
                    </div>
                )}

                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span>
                        By @{(spec.owner as any)?.full_name || 'Unknown'}
                    </span>
                    <span>·</span>
                    <span>
                        Updated {formatRelativeTime(spec.updated_at)}
                    </span>
                    <span>·</span>
                    <span>
                        Created {formatDate(spec.created_at)}
                    </span>
                    {unresolvedCount > 0 && (
                        <>
                            <span>·</span>
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="text-orange-500 dark:text-orange-400 hover:underline focus:outline-none"
                            >
                                💬 {unresolvedCount} unresolved
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-start gap-4">
                <div className={`flex-1 min-w-0`}>
                    {/* Content Section */}
                    <div className="bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-8 shadow-sm">
                        <MarkdownRenderer
                            content={content}
                            onCommentClick={handleCommentClick}
                        />
                    </div>
                </div>

                <CommentSidebar
                    specId={spec.id}
                    currentUser={currentUser}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    activeHeadingId={activeHeadingId}
                    orgSlug={org.slug}
                />
            </div>

            {!isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="fixed bottom-8 right-8 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors z-30"
                    title="Open Comments"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </button>
            )}
        </div>
    );
}
