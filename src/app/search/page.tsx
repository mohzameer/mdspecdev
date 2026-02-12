import { createClient } from '@/lib/supabase/server';
import { SpecCard, SpecWithRelations } from '@/components/dashboard/SpecCard';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function SearchPage(props: { searchParams: Promise<{ q?: string }> }) {
    const searchParams = await props.searchParams;
    const query = searchParams?.q || '';
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    if (!query.trim()) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-4">Search</h1>
                <p className="text-slate-500">Please enter a search term.</p>
            </div>
        );
    }

    // 1. Search Specs (Title/Tags)
    const { data: specMatches } = await supabase
        .from('specs')
        .select('id')
        .textSearch('search_vector', query);

    // 2. Search Sections (Content)
    const { data: sectionMatches } = await supabase
        .from('spec_sections')
        .select('spec_id, heading_id, heading_text, content')
        .textSearch('search_vector', query)
        .limit(100);

    // 3. Combine unique Spec IDs
    const specIds = new Set<string>();
    specMatches?.forEach((s) => specIds.add(s.id));
    sectionMatches?.forEach((s) => specIds.add(s.spec_id));

    if (specIds.size === 0) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-4">Search Results for "{query}"</h1>
                <p className="text-slate-500">No results found.</p>
            </div>
        );
    }

    const { data: specs } = (await supabase
        .from('specs')
        .select(
            `
      id,
      name,
      slug,
      progress,
      status,
      maturity,
      tags,
      updated_at,
      archived_at,
      owner:profiles!specs_owner_id_fkey(full_name, avatar_url),
      project:projects(
        id,
        name,
        slug,
        organization:organizations(id, name, slug)
      ),
      comment_threads(id, resolved, comments(id, deleted)),
      revisions(id)
    `
        )
        .in('id', Array.from(specIds))
        .order('updated_at', { ascending: false })) as { data: SpecWithRelations[] | null };

    // Helper to get snippets
    const getSnippet = (text: string, term: string) => {
        const lowerText = text.toLowerCase();
        const lowerTerm = term.toLowerCase();
        const index = lowerText.indexOf(lowerTerm);
        if (index === -1) return text.substring(0, 150) + '...';

        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + 100);
        return (start > 0 ? '...' : '') +
            text.substring(start, end) +
            (end < text.length ? '...' : '');
    };

    // highlighting helper (simple)
    const Highlight = ({ text, term }: { text: string; term: string }) => {
        const parts = text.split(new RegExp(`(${term})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === term.toLowerCase() ?
                        <span key={i} className="bg-yellow-200 dark:bg-yellow-900 font-medium">{part}</span> :
                        part
                )}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
                    Results for "{query}"
                </h1>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {specs?.map((spec) => {
                        const sections = sectionMatches?.filter(s => s.spec_id === spec.id) || [];

                        return (
                            <div key={spec.id} className="flex flex-col h-full">
                                <div className="flex-1">
                                    <SpecCard spec={spec as SpecWithRelations} />
                                </div>

                                {sections.length > 0 && (
                                    <div className="mt-2 ml-4 space-y-2 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                            Matches in content:
                                        </p>
                                        {sections.slice(0, 3).map((section, idx) => (
                                            <Link
                                                key={idx}
                                                href={`/${spec.project.organization.slug}/${spec.project.slug}/${spec.slug}#${section.heading_id}`}
                                                className="block p-3 bg-white dark:bg-slate-800 rounded-lg text-sm hover:shadow-md transition-shadow"
                                            >
                                                <div className="font-medium text-slate-900 dark:text-white mb-1">
                                                    {section.heading_text}
                                                </div>
                                                <div className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2">
                                                    <Highlight text={getSnippet(section.content, query)} term={query} />
                                                </div>
                                            </Link>
                                        ))}
                                        {sections.length > 3 && (
                                            <div className="text-xs text-slate-400 italic">
                                                + {sections.length - 3} more matches
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
