import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();



  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300 px-4">
      <div className="text-center max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
          mdspec
        </h1>

        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          An opensource lightweight specification governance platform for technical teams.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="px-8 py-4 w-full sm:w-auto min-w-[160px] inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 text-lg"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 w-full sm:w-auto min-w-[160px] inline-flex items-center justify-center bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white font-medium rounded-xl transition-all duration-200 border border-slate-200 dark:border-slate-700 text-lg shadow-sm"
          >
            Sign In
          </Link>
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
