'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { marked } from 'marked';

interface TableOfContentsProps {
    content: string;
    className?: string;
}

interface TocItem {
    id: string;
    uniqueKey: string;
    text: string;
    level: number;
    index: number;
}

export function TableOfContents({ content, className = '' }: TableOfContentsProps) {
    const [activeKey, setActiveKey] = useState<string>('');
    const headingElementsRef = useRef<Map<string, Element>>(new Map());
    const headingsRef = useRef<TocItem[]>([]);

    // Parse headings from markdown
    const headings = useMemo(() => {
        const tokens = marked.lexer(content);
        const items: TocItem[] = [];
        let idx = 0;

        const slugify = (text: string) => {
            return text
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        };

        marked.walkTokens(tokens, (token) => {
            if (token.type === 'heading') {
                const id = slugify(token.text);
                items.push({
                    id,
                    uniqueKey: `${id}-${idx}`,
                    text: token.text,
                    level: token.depth,
                    index: idx,
                });
                idx++;
            }
        });

        headingsRef.current = items;
        return items;
    }, [content]);

    // Map DOM elements on mount / when headings change
    useEffect(() => {
        const allHeadingElements = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
        const newMap = new Map<string, Element>();

        let tocIndex = 0;
        allHeadingElements.forEach((el) => {
            if (tocIndex < headings.length && el.id === headings[tocIndex].id) {
                newMap.set(headings[tocIndex].uniqueKey, el);
                tocIndex++;
            }
        });

        headingElementsRef.current = newMap;
    }, [headings]);

    // Scroll spy using scroll events - determines which heading is currently "active"
    const updateActiveHeading = useCallback(() => {
        const headerOffset = 100; // offset for sticky nav
        const entries: { key: string; top: number }[] = [];

        headingElementsRef.current.forEach((el, key) => {
            const rect = el.getBoundingClientRect();
            entries.push({ key, top: rect.top });
        });

        // Sort by position in document
        entries.sort((a, b) => a.top - b.top);

        // Find the last heading that has scrolled past the top offset
        let currentKey = entries.length > 0 ? entries[0].key : '';
        for (const entry of entries) {
            if (entry.top <= headerOffset) {
                currentKey = entry.key;
            } else {
                break;
            }
        }

        if (currentKey) {
            setActiveKey(currentKey);
        }
    }, []);

    useEffect(() => {
        // Initial check
        const timer = setTimeout(updateActiveHeading, 100);

        window.addEventListener('scroll', updateActiveHeading, { passive: true });
        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', updateActiveHeading);
        };
    }, [updateActiveHeading]);

    const scrollToHeading = (uniqueKey: string) => {
        const element = headingElementsRef.current.get(uniqueKey);
        if (element) {
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setActiveKey(uniqueKey);
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
                    <li key={heading.uniqueKey} className={`pl-4 ${heading.level > 2 ? 'pl-8' : ''}`}>
                        <button
                            onClick={() => scrollToHeading(heading.uniqueKey)}
                            className={`text-sm text-left transition-colors duration-200 hover:text-blue-600 dark:hover:text-blue-400 ${activeKey === heading.uniqueKey
                                ? 'text-blue-600 dark:text-blue-400 font-medium -ml-[1px] pl-2 border-l-2 border-blue-600'
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
