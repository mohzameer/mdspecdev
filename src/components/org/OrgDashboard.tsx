'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProgressBar } from '@/components/spec/ProgressBar';
import { StatusBadge, TagsList } from '@/components/spec/StatusBadge';
import { formatRelativeTime } from '@/lib/utils';

interface OrgDashboardProps {
    org: {
        id: string;
        name: string;
        slug: string;
    };
    projects: Array<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        specs: any[];
    }>;
    allSpecs: Array<any>;
    userId: string;
    metrics: {
        totalProjects: number;
        totalSpecs: number;
        unresolvedComments: number;
        completedSpecs: number;
        inProgressSpecs: number;
        mySpecsCount: number;
    };
    filterOptions: {
        projects: Array<{ id: string; name: string }>;
        owners: Array<{ id: string; name: string }>;
        statuses: string[];
    };
    initialFilters: {
        projectId: string;
        status: string;
        ownerId: string;
        search: string;
        mySpecs: boolean;
    };
}

export function OrgDashboard({
    org,
    projects,
    allSpecs,
    userId,
    metrics,
    filterOptions,
    initialFilters
}: OrgDashboardProps) {
    const router = useRouter();
    const [search, setSearch] = useState(initialFilters.search);
    const [projectFilter, setProjectFilter] = useState(initialFilters.projectId);
    const [statusFilter, setStatusFilter] = useState(initialFilters.status);
    const [ownerFilter, setOwnerFilter] = useState(initialFilters.ownerId);
    const [mySpecsOnly, setMySpecsOnly] = useState(initialFilters.mySpecs);

    // Filter specs
    const filteredSpecs = useMemo(() => {
        return allSpecs.filter(spec => {
            // Search filter
            if (search && !spec.name.toLowerCase().includes(search.toLowerCase())) {
                return false;
            }
            // Project filter
            if (projectFilter && spec.projectId !== projectFilter) {
                return false;
            }
            // Status filter
            if (statusFilter && spec.status !== statusFilter) {
                return false;
            }
            // Owner filter
            if (ownerFilter && spec.owner_id !== ownerFilter) {
                return false;
            }
            // My specs filter
            if (mySpecsOnly && spec.owner_id !== userId) {
                return false;
            }
            return true;
        });
    }, [allSpecs, search, projectFilter, statusFilter, ownerFilter, mySpecsOnly, userId]);

    // Group filtered specs by project
    const groupedSpecs = useMemo(() => {
        const groups = new Map<string, { project: any; specs: any[] }>();

        filteredSpecs.forEach(spec => {
            if (!groups.has(spec.projectId)) {
                groups.set(spec.projectId, {
                    project: {
                        id: spec.projectId,
                        name: spec.projectName,
                        slug: spec.projectSlug
                    },
                    specs: []
                });
            }
            groups.get(spec.projectId)!.specs.push(spec);
        });

        return Array.from(groups.values());
    }, [filteredSpecs]);

    const clearFilters = () => {
        setSearch('');
        setProjectFilter('');
        setStatusFilter('');
        setOwnerFilter('');
        setMySpecsOnly(false);
    };

    const hasActiveFilters = search || projectFilter || statusFilter || ownerFilter || mySpecsOnly;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <div className="mb-4">
                    <Link
                        href="/dashboard"
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm"
                    >
                        ← Back to dashboard
                    </Link>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">
                                {org.name[0].toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                                {org.name}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400">Organization</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href={`/${org.slug}/members`}
                            className="px-4 py-2 bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/20 text-slate-700 dark:text-white font-medium rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                            Manage Members
                        </Link>
                        <Link
                            href={`/${org.slug}/new`}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                        >
                            New Project
                        </Link>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <MetricCard label="Projects" value={metrics.totalProjects} icon="📁" />
                    <MetricCard label="Specs" value={metrics.totalSpecs} icon="📄" />
                    <MetricCard label="Completed" value={metrics.completedSpecs} icon="✅" color="green" />
                    <MetricCard label="In Progress" value={metrics.inProgressSpecs} icon="🔄" color="blue" />
                    <MetricCard label="Open Discussions" value={metrics.unresolvedComments} icon="💬" color="orange" />
                    <MetricCard
                        label="My Specs"
                        value={metrics.mySpecsCount}
                        icon="👤"
                        onClick={() => setMySpecsOnly(!mySpecsOnly)}
                        active={mySpecsOnly}
                    />
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 shadow-sm">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Search specs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Project Filter */}
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Projects</option>
                            {filterOptions.projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Statuses</option>
                            {filterOptions.statuses.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>

                        {/* Owner Filter */}
                        <select
                            value={ownerFilter}
                            onChange={(e) => setOwnerFilter(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Owners</option>
                            {filterOptions.owners.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    {/* Active filters summary */}
                    {hasActiveFilters && (
                        <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                            Showing {filteredSpecs.length} of {allSpecs.length} specs
                        </div>
                    )}
                </div>

                {/* Specs grouped by project */}
                {groupedSpecs.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <span className="text-2xl">🔍</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {hasActiveFilters ? 'No specs match your filters' : 'No specs yet'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            {hasActiveFilters
                                ? 'Try adjusting your filters or search terms.'
                                : 'Create a project and add your first specification.'}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                onClick={clearFilters}
                                className="inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                            >
                                Clear Filters
                            </button>
                        ) : (
                            <Link
                                href={`/${org.slug}/new`}
                                className="inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                            >
                                Create Project
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groupedSpecs.map(({ project, specs }) => (
                            <div key={project.id}>
                                {/* Project Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <Link
                                        href={`/${org.slug}/${project.slug}`}
                                        className="flex items-center gap-2 group"
                                    >
                                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {project.name}
                                        </h2>
                                        <span className="text-slate-400 dark:text-slate-500 text-sm">
                                            ({specs.length} spec{specs.length !== 1 ? 's' : ''})
                                        </span>
                                    </Link>
                                    <Link
                                        href={`/${org.slug}/${project.slug}/new`}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
                                    >
                                        + New Spec
                                    </Link>
                                </div>

                                {/* Spec Cards Grid */}
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {specs.map((spec: any) => (
                                        <SpecCard
                                            key={spec.id}
                                            spec={spec}
                                            orgSlug={org.slug}
                                            projectSlug={project.slug}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value,
    icon,
    color = 'slate',
    onClick,
    active = false
}: {
    label: string;
    value: number;
    icon: string;
    color?: 'slate' | 'green' | 'blue' | 'orange';
    onClick?: () => void;
    active?: boolean;
}) {
    const colorClasses = {
        slate: 'text-slate-600 dark:text-slate-400',
        green: 'text-green-600 dark:text-green-400',
        blue: 'text-blue-600 dark:text-blue-400',
        orange: 'text-orange-600 dark:text-orange-400'
    };

    const Component = onClick ? 'button' : 'div';

    return (
        <Component
            onClick={onClick}
            className={`p-4 bg-white dark:bg-slate-800/50 rounded-xl border transition-all ${active
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-white/20'
                } ${onClick ? 'cursor-pointer' : ''} shadow-sm`}
        >
            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{icon}</span>
                <span className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </Component>
    );
}

function SpecCard({
    spec,
    orgSlug,
    projectSlug
}: {
    spec: any;
    orgSlug: string;
    projectSlug: string;
}) {
    const unresolvedCount = spec.comment_threads?.filter((t: any) => !t.resolved).length || 0;
    const revisionCount = spec.revisions?.length || 0;

    return (
        <Link
            href={`/${orgSlug}/${projectSlug}/${spec.slug}`}
            className="block p-6 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 transition-all duration-200 group shadow-sm"
        >
            <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {spec.name}
                </h3>
                <StatusBadge status={spec.status} />
            </div>

            <TagsList tags={spec.tags} />

            {spec.progress !== null && (
                <div className="mt-4">
                    <ProgressBar progress={spec.progress} size="sm" />
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span>@{spec.owner?.full_name || 'Unknown'}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(spec.updated_at)}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
                    {unresolvedCount > 0 && (
                        <span className="text-orange-500 dark:text-orange-400">
                            💬 {unresolvedCount}
                        </span>
                    )}
                    <span>{revisionCount} rev</span>
                </div>
            </div>
        </Link>
    );
}
