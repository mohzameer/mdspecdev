'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Organization {
    id: string;
    name: string;
    slug: string;
}

interface Project {
    id: string;
    name: string;
    slug: string;
}

interface SpecCreationWizardProps {
    initialOrgs: Organization[];
}

export function SpecCreationWizard({ initialOrgs }: SpecCreationWizardProps) {
    const router = useRouter();
    const supabase = createClient();

    const [selectedOrgId, setSelectedOrgId] = useState<string>(initialOrgs.length > 0 ? initialOrgs[0].id : '');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');

    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);

    // Auto-select single org
    useEffect(() => {
        if (initialOrgs.length === 1) {
            setSelectedOrgId(initialOrgs[0].id);
        }
    }, [initialOrgs]);

    // Fetch projects when org changes
    useEffect(() => {
        async function fetchProjects() {
            if (!selectedOrgId) {
                setProjects([]);
                return;
            }

            setLoadingProjects(true);
            const { data } = await supabase
                .from('projects')
                .select('id, name, slug')
                .eq('org_id', selectedOrgId)
                .order('name');

            setProjects(data || []);
            setLoadingProjects(false);
            // Reset project selection when org changes
            setSelectedProjectId('');
        }

        fetchProjects();
    }, [selectedOrgId, supabase]);

    const handleContinue = () => {
        if (!selectedOrgId || !selectedProjectId) return;

        const org = initialOrgs.find(o => o.id === selectedOrgId);
        const project = projects.find(p => p.id === selectedProjectId);

        if (org && project) {
            router.push(`/${org.slug}/${project.slug}/new`);
        }
    };

    if (initialOrgs.length === 0) {
        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No Organizations Found</h3>
                <p className="text-slate-500 mb-6">You need to create an organization before you can create a specification.</p>
                <Link
                    href="/new-org"
                    className="inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                >
                    Create Organization
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
            <div className="space-y-6">
                {/* Organization Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Organization
                    </label>
                    {initialOrgs.length === 1 ? (
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium">
                            {initialOrgs[0].name}
                        </div>
                    ) : (
                        <div className="relative">
                            <select
                                value={selectedOrgId}
                                onChange={(e) => setSelectedOrgId(e.target.value)}
                                className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                            >
                                <option value="" disabled>Select an organization</option>
                                {initialOrgs.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500 dark:text-slate-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    )}
                </div>

                {/* Project Selection */}
                <div className={`transition-opacity duration-200 ${!selectedOrgId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Project
                    </label>
                    <div className="relative">
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            disabled={!selectedOrgId || loadingProjects}
                            className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-50 disabled:dark:bg-slate-900 disabled:cursor-not-allowed appearance-none"
                        >
                            <option value="">
                                {loadingProjects
                                    ? 'Loading projects...'
                                    : projects.length === 0
                                        ? 'No projects found'
                                        : 'Select a project'
                                }
                            </option>
                            {projects.map(project => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500 dark:text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    {selectedOrgId && !loadingProjects && projects.length === 0 && (
                        <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                            This organization has no projects. {' '}
                            <Link href={`/${initialOrgs.find(o => o.id === selectedOrgId)?.slug}/new`} className="underline hover:text-amber-700 dark:hover:text-amber-300">
                                Create one first.
                            </Link>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-between">
                    <Link
                        href="/dashboard"
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        onClick={handleContinue}
                        disabled={!selectedOrgId || !selectedProjectId}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
