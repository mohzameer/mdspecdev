import Link from 'next/link';

export default function GuideLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="font-bold text-xl tracking-tight text-slate-900 dark:text-white hover:opacity-80 transition-opacity">
                                mdspec
                            </Link>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                            <Link href="/guide" className="text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white transition-colors">
                                Guides
                            </Link>
                        </div>

                        <div className="flex items-center gap-6 text-sm font-medium">
                            <Link href="/guide/vscode" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                                VS Code
                            </Link>
                            <Link href="/guide/cli" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                                CLI
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
