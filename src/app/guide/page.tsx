import Link from 'next/link';

export default function GuidePage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
                    MDSpec Guides
                </h1>
                <p className="max-w-xl mt-5 mx-auto text-xl text-slate-500 dark:text-slate-400">
                    Learn how to get the most out of MDSpec with our tools and integrations.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="relative group bg-white dark:bg-slate-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                    <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-4 ring-white dark:ring-slate-800">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-8">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                            <Link href="/guide/vscode" className="focus:outline-none">
                                <span className="absolute inset-0" aria-hidden="true" />
                                VS Code Extension Guide
                            </Link>
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Learn how to sync Markdown files between your local workspace and the MDSpec web platform using our official VS Code extension.
                        </p>
                    </div>
                </div>

                <div className="relative group bg-white dark:bg-slate-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                    <div>
                        <span className="rounded-lg inline-flex p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 ring-4 ring-white dark:ring-slate-800">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-8">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                            <Link href="/guide/cli" className="focus:outline-none">
                                <span className="absolute inset-0" aria-hidden="true" />
                                CLI Guide
                            </Link>
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Sync your local Markdown specs with MDSpec right from the terminal. No editor required. Perfect for CI/CD and automation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
