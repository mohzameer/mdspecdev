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
          An opensource lightweight specification management platform for technical teams.
        </p>

        <div className="flex flex-col lg:flex-row flex-wrap items-start justify-center gap-3 lg:gap-4 w-full">
          {/* How it works button */}
          <div className="flex flex-col items-center w-full lg:w-auto mt-0">
            <VideoPopup />
          </div>

          {/* Get Extension button */}
          <div className="flex flex-col items-center w-full lg:w-auto">
            <Link
              href="/guide/vscode"
              className="px-6 py-4 w-full lg:w-auto min-w-[200px] inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 text-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.5 11H21a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2h-2a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2z" />
              </svg>
              <span>Get Extension</span>
            </Link>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              works with VSCode, Cursor, Antigravity
            </p>
          </div>

          {/* CLI Guide button */}
          <div className="flex flex-col items-center w-full lg:w-auto">
            <Link
              href="/guide/cli"
              className="px-6 py-4 w-full lg:w-auto min-w-[200px] inline-flex items-center justify-center gap-3 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white font-medium rounded-xl transition-all duration-200 border border-slate-200 dark:border-slate-700 text-lg shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" x2="20" y1="19" y2="19" />
              </svg>
              <span>CLI Guide</span>
            </Link>
          </div>

          {/* GitHub button */}
          <div className="flex flex-col items-center w-full lg:w-auto">
            <a
              href="https://github.com/mohzameer/mdspecdev"
              target="_blank"
              rel="noreferrer"
              title="GitHub Repository"
              className="p-4 inline-flex items-center justify-center bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white rounded-xl transition-all duration-200 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.463 2 11.97c0 4.404 2.865 8.14 6.839 9.458.5.092.682-.216.682-.48 0-.236-.008-.864-.013-1.695-2.782.602-3.369-1.337-3.369-1.337-.454-1.151-1.11-1.458-1.11-1.458-.908-.618.069-.606.069-.606 1.003.07 1.531 1.027 1.531 1.027.892 1.524 2.341 1.084 2.91.828.092-.643.35-1.083.636-1.332-2.22-.251-4.555-1.107-4.555-4.927 0-1.088.39-1.975 1.029-2.669-.103-.252-.446-1.266.098-2.63 0 0 .84-.269 2.75 1.022A9.607 9.607 0 0112 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.365.202 2.379.1 2.631.64.694 1.028 1.581 1.028 2.669 0 3.83-2.339 4.673-4.566 4.92.359.307.678.915.678 1.846 0 1.332-.012 2.407-.012 2.734 0 .267.18.577.688.48 3.97-1.32 6.833-5.054 6.833-9.458C22 6.463 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* 
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
              Every change creates a snapshot. Compare revisions, restore previous versions. Works parallel to Git, not integrated.
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
          */}

          <div className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <span className="text-xl">🤝</span>
              Secure Sharing
            </h3>
            <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
              Share specifications securely outside of version control platforms. Ideal for cross-team communication and aligning with agentic development workflows.
              <span className="block mt-1.5 font-medium text-slate-700 dark:text-slate-300">e.g., Compliance, Security Modelling, and Marketing</span>
            </p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <span className="text-xl">🔗</span>
              Linked Specs
            </h3>
            <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
              Keep specifications perfectly synced across independent repositories without monorepos or manual copy-pasting.
              <span className="block mt-1.5 font-medium text-slate-700 dark:text-slate-300">e.g., Connect Backend API documentation seamlessly with Frontend specifications.</span>
            </p>
          </div>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScSB_JcCZZ-wi97XqawQBvnb24I7Yceyna5LHM4Gr9gsm_P7Q/viewform?usp=publish-editor"
            target="_blank"
            rel="noreferrer"
            className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200 block"
          >
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2 flex-wrap">
              <span className="text-xl">🧩</span>
              Cohesive Integrations
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 uppercase tracking-wider">
                ON REQUEST
              </span>
            </h3>
            <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
              Position MDSpec as your specification central. An agentic template layer transforms and integrates documents into any external tool.
              <span className="block mt-1.5 font-medium text-slate-700 dark:text-slate-300">e.g., Task templates for ClickUp, Analysis on a spec posted to another tool.</span>
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
