'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

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
    initialFilters,
}: OrgDashboardProps) {
    const [search, setSearch] = useState(initialFilters.search);

    // Filter projects by name
    const filteredProjects = useMemo(() => {
        if (!search.trim()) return projects;
        return projects.filter((p) =>
            p.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [projects, search]);

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

                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <MetricCard label="Projects" value={metrics.totalProjects} icon="📁" />
                    <MetricCard label="Specs" value={metrics.totalSpecs} icon="📄" />
                    <MetricCard label="Completed" value={metrics.completedSpecs} icon="✅" color="green" />
                    <MetricCard label="Open Discussions" value={metrics.unresolvedComments} icon="💬" color="orange" />
                </div>

                {/* Search */}
                <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 shadow-sm">
                    <input
                        type="text"
                        placeholder="Search projects…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Project grid */}
                {filteredProjects.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <span className="text-4xl mb-4 block">🔍</span>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {search ? 'No projects match your search' : 'No projects yet'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            {search
                                ? 'Try a different search term.'
                                : 'Create your first project to get started.'}
                        </p>
                        {!search && (
                            <Link
                                href={`/${org.slug}/new`}
                                className="inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                            >
                                Create Project
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredProjects.map((project) => {
                            const specCount = project.specs?.length ?? 0;
                            return (
                                <Link
                                    key={project.id}
                                    href={`/${org.slug}/${project.slug}`}
                                    className="group block bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h2 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {project.name}
                                        </h2>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 flex-shrink-0">
                                            {specCount} spec{specCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    {project.description && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {project.description}
                                        </p>
                                    )}
                                </Link>
                            );
                        })}
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
}: {
    label: string;
    value: number;
    icon: string;
    color?: 'slate' | 'green' | 'blue' | 'orange';
}) {
    const colorClasses: Record<string, string> = {
        slate: 'text-slate-600 dark:text-slate-400',
        green: 'text-green-600 dark:text-green-400',
        blue: 'text-blue-600 dark:text-blue-400',
        orange: 'text-orange-600 dark:text-orange-400',
    };

    return (
        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{icon}</span>
                <span className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
    );
}
