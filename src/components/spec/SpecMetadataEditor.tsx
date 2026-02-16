'use client';

import { Status, Maturity } from '@/lib/types';

interface SpecMetadataEditorProps {
    status: Status;
    setStatus: (status: Status) => void;
    maturity: Maturity;
    setMaturity: (maturity: Maturity) => void;
    progress: number;
    setProgress: (progress: number) => void;
    tagsInput: string;
    setTagsInput: (tags: string) => void;
}

export function SpecMetadataEditor({
    status,
    setStatus,
    maturity,
    setMaturity,
    progress,
    setProgress,
    tagsInput,
    setTagsInput,
}: SpecMetadataEditorProps) {
    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-4">
                Metadata
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Status
                    </label>
                    <div className="relative">
                        <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as Status)}
                            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                        >
                            <option value="planned">Planned</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500 dark:text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="maturity" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Maturity
                    </label>
                    <div className="relative">
                        <select
                            id="maturity"
                            value={maturity}
                            onChange={(e) => setMaturity(e.target.value as Maturity)}
                            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                        >
                            <option value="draft">Draft</option>
                            <option value="review">In Review</option>
                            <option value="stable">Stable</option>
                            <option value="deprecated">Deprecated</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500 dark:text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Tags (comma separated)
                    </label>
                    <input
                        id="tags"
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="api, security, v1"
                    />
                </div>

                <div>
                    <label htmlFor="progress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Progress: {progress}%
                    </label>
                    <input
                        id="progress"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={progress}
                        onChange={(e) => setProgress(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
