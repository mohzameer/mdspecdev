import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBlogPost, getBlogPosts } from '@/lib/blog';
import { MarkdownRenderer } from '@/components/spec/MarkdownRenderer';

interface Props {
    params: Promise<{
        slug: string;
    }>;
}

export async function generateMetadata(props: Props) {
    const params = await props.params;
    const post = getBlogPost(params.slug);

    if (!post) {
        return {
            title: 'Post Not Found',
        };
    }

    return {
        title: `${post.metadata.title} - mdspec Blog`,
        description: post.metadata.description,
    };
}

export function generateStaticParams() {
    const posts = getBlogPosts();
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

export default async function BlogPostPage(props: Props) {
    const params = await props.params;
    const post = getBlogPost(params.slug);

    if (!post) {
        notFound();
    }

    return (
        <main className="container mx-auto max-w-3xl px-4 py-16">
            <Link
                href="/blog"
                className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-8 transition-colors"
            >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Blog
            </Link>

            <article>
                <header className="mb-12 text-center pb-8 border-b border-slate-200 dark:border-slate-800">
                    {post.metadata.date && (
                        <time
                            dateTime={post.metadata.date}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-4 block"
                        >
                            {new Date(post.metadata.date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </time>
                    )}
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl mb-4">
                        {post.metadata.title}
                    </h1>
                    {post.metadata.description && (
                        <p className="text-xl text-slate-600 dark:text-slate-400">
                            {post.metadata.description}
                        </p>
                    )}
                </header>

                <div className="prose-wrapper">
                    <MarkdownRenderer
                        content={post.content}
                        disableHeadingIds={true}
                        className="mx-auto"
                    />
                </div>
            </article>
        </main>
    );
}
