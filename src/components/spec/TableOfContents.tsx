
'use client';

import { useEffect, useState, useMemo } from 'react';
import { marked } from 'marked';

interface TableOfContentsProps {
    content: string;
    className?: string;
}

interface TocItem {
    id: string;
    text: string;
    level: number;
}

export function TableOfContents({ content, className = '' }: TableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>('');

    // Parse headings from markdown
    const headings = useMemo(() => {
        const tokens = marked.lexer(content);
        const items: TocItem[] = [];

        // Helper to slugify text (MUST match MarkdownRenderer logic)
        const slugify = (text: string) => {
            return text
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        };

        marked.walkTokens(tokens, (token) => {
            if (token.type === 'heading') {
                items.push({
                    id: slugify(token.text),
                    text: token.text,
                    level: token.depth,
                });
            }
        });

        return items;
    }, [content]);

    // Scroll Spy Logic
    useEffect(() => {
        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            // Find the first intersecting entry, or the one closest to top
            // This is a simple implementation; rigorous spy might need more math
            const visibleHeadings = entries.filter(e => e.isIntersecting);

            if (visibleHeadings.length > 0) {
                // If multiple are visible, pick the one closest to the top of the viewport?
                // or just the first one in the list (since we observe in order)
                setActiveId(visibleHeadings[0].target.id);
            }
        };

        const observer = new IntersectionObserver(observerCallback, {
            rootMargin: '-10% 0px -80% 0px', // Trigger when heading is near top
            threshold: 0
        });

        headings.forEach(heading => {
            const element = document.getElementById(heading.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [headings]);

    const scrollToHeading = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            // Offset for sticky header
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            // Update active ID immediately for responsiveness
            setActiveId(id);
        }
    };

    if (headings.length === 0) return null;

    return (
        <nav className={`toc-container ${className}`}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                On this page
            </h3>
            <ul className="space-y-2 border-l border-slate-200 dark:border-slate-800">
                {headings.map((heading) => (
                    <li key={heading.id} className={`pl-4 ${heading.level > 2 ? 'pl-8' : ''}`}>
                        <button
                            onClick={() => scrollToHeading(heading.id)}
                            className={`text-sm text-left transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400 ${activeId === heading.id
                                    ? 'text-blue-600 dark:text-blue-400 font-medium -ml-[1px] border-l-2 border-blue-600'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            {heading.text}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
