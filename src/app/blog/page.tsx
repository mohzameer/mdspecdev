import Link from 'next/link';
import { getBlogPosts } from '@/lib/blog';

export const metadata = {
    title: 'Blog - mdspec',
    description: 'Read the latest updates, tutorials, and deep dives from the mdspec team.',
};

export default function BlogListingPage() {
    const posts = getBlogPosts();

    return (
        <main className="container mx-auto max-w-4xl px-4 py-16">
            <div className="mb-12 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl mb-4">
                    Latest Updates
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                    News, tutorials, and engineering deep dives from the mdspec team.
                </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2">
                {posts.map((post) => (
                    <Link
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    >
                        <div>
                            {post.date && (
                                <time
                                    dateTime={post.date}
                                    className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 block"
                                >
                                    {new Date(post.date).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </time>
                            )}
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {post.title}
                            </h2>
                            {post.description && (
                                <p className="text-slate-600 dark:text-slate-300 line-clamp-3">
                                    {post.description}
                                </p>
                            )}
                        </div>

                        <div className="mt-6 flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                            Read article
                            <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>
                    </Link>
                ))}
            </div>

            {posts.length === 0 && (
                <div className="text-center py-20 text-slate-500 dark:text-slate-400">
                    No blog posts found. Check back later!
                </div>
            )}
        </main>
    );
}
