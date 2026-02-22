import Link from 'next/link';

export default function ContactPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
                    Contact Us
                </h1>
                <p className="max-w-xl mt-5 mx-auto text-xl text-slate-500 dark:text-slate-400">
                    Get in touch with the creator of MDSpec.
                </p>
            </div>

            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Name</h3>
                        <p className="mt-1 text-slate-500 dark:text-slate-400 text-lg">Mohammed Zameer</p>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Email</h3>
                        <a href="mailto:zameermfm@live.com" className="mt-1 text-blue-600 dark:text-blue-400 hover:underline text-lg inline-block">
                            zameermfm@live.com
                        </a>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">GitHub</h3>
                        <a href="https://github.com/mohzameer" target="_blank" rel="noreferrer" className="mt-1 text-blue-600 dark:text-blue-400 hover:underline text-lg flex items-center justify-center gap-2">
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.463 2 11.97c0 4.404 2.865 8.14 6.839 9.458.5.092.682-.216.682-.48 0-.236-.008-.864-.013-1.695-2.782.602-3.369-1.337-3.369-1.337-.454-1.151-1.11-1.458-1.11-1.458-.908-.618.069-.606.069-.606 1.003.07 1.531 1.027 1.531 1.027.892 1.524 2.341 1.084 2.91.828.092-.643.35-1.083.636-1.332-2.22-.251-4.555-1.107-4.555-4.927 0-1.088.39-1.975 1.029-2.669-.103-.252-.446-1.266.098-2.63 0 0 .84-.269 2.75 1.022A9.607 9.607 0 0112 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.365.202 2.379.1 2.631.64.694 1.028 1.581 1.028 2.669 0 3.83-2.339 4.673-4.566 4.92.359.307.678.915.678 1.846 0 1.332-.012 2.407-.012 2.734 0 .267.18.577.688.48 3.97-1.32 6.833-5.054 6.833-9.458C22 6.463 17.522 2 12 2z" />
                            </svg>
                            mohzameer
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
