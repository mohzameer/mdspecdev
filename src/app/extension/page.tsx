import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';

export const metadata = {
    title: 'Download mdspec Extension',
    description: 'Download the mdspec extension for VSCode, Cursor, and Antigravity.',
};

export default function ExtensionPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-start bg-slate-50 dark:bg-slate-900 transition-colors duration-300 px-4 pt-4 pb-20">
            <div className="text-center max-w-4xl mx-auto w-full pt-12 md:pt-20">
                <Link href="/" className="inline-flex flex-col items-center justify-center mb-12 transition-transform hover:scale-105 group">
                    <Logo className="h-16 w-16 drop-shadow-xl" />
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-3 block group-hover:text-blue-500 transition-colors">
                        Back to Home
                    </span>
                </Link>

                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
                    Get the mdspec Extension
                </h1>

                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                    Unlock the full power of mdspec inside your favorite editor. Available for VSCode, Cursor, and Antigravity.
                </p>

                <div className="bg-white dark:bg-slate-800/80 p-8 md:p-12 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-none mb-12">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" x2="12" y1="15" y2="3" />
                            </svg>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                            Direct Download
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md text-center">
                            Download the <strong>.vsix</strong> file and install it manually from the Extensions view in your editor using the "Install from VSIX..." command.
                        </p>
                        <a
                            href="/mdspec-0.0.7.vsix"
                            download
                            className="px-8 py-4 w-full sm:w-auto min-w-[280px] inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-2xl transition-all duration-200 shadow-lg shadow-blue-500/25 text-lg hover:-translate-y-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" x2="12" y1="15" y2="3" />
                            </svg>
                            <span>Download mdspec-0.0.7.vsix</span>
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
                    <a
                        href="https://marketplace.visualstudio.com/items?itemName=XADLabs.mdspec"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center p-8 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all group hover:border-blue-500/30"
                    >
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.5 11H21a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2h-2a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">VSCode Marketplace</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-center text-sm">
                            Install directly from the official Visual Studio Code marketplace.
                        </p>
                    </a>

                    <a
                        href="https://open-vsx.org/extension/XADLabs/mdspec"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center p-8 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all group hover:border-blue-500/30"
                    >
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.5 11H21a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2h-2a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Open VSX Registry</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-center text-sm">
                            For Cursor, VSCodium, Antigravity, and other Open VSX supported editors.
                        </p>
                    </a>
                </div>
            </div>
        </div>
    );
}
