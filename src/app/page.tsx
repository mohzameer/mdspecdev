import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';


import { Logo } from '@/components/shared/Logo';
import { VideoPopup } from '@/components/home/VideoPopup';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();



  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-slate-50 dark:bg-slate-900 transition-colors duration-300 px-4 pt-4">
      <div className="text-center max-w-3xl mx-auto">
        <div className="mb-8">
          <Logo className="h-16 w-16 mx-auto drop-shadow-xl" />
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
          mdspec
        </h1>

        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          An opensource lightweight specification governance platform for technical teams.
        </p>

        <div className="flex flex-col sm:flex-row items-start justify-center gap-6 w-full">
          <div className="flex flex-col items-center w-full sm:w-auto">
            <VideoPopup />
          </div>

          <div className="flex flex-col items-center w-full sm:w-auto">
            <Link
              href="/extension"
              className="px-8 py-4 w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 text-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.5 11H21a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2h-2a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2z" />
              </svg>
              <span>Get Extension</span>
            </Link>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              works with VSCode, Cursor, Antigravity
            </p>
          </div>

          <div className="flex flex-col items-center w-full sm:w-auto">
            <a
              href="https://www.npmjs.com/package/mdspec-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center gap-3 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white font-medium rounded-xl transition-all duration-200 border border-slate-200 dark:border-slate-700 text-lg shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" x2="20" y1="19" y2="19" />
              </svg>
              <span>Get CLI</span>
            </a>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-2xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Markdown-Native
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Write specs in markdown with YAML frontmatter for metadata. Portable and version-control friendly.
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-2xl mb-3">🔄</div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Revision Tracking
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Every change creates a snapshot. Compare revisions, restore previous versions, track progress.
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-2xl mb-3">💬</div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Section Comments
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Anchor discussions to specific sections. Threaded comments, @mentions, and resolution tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
