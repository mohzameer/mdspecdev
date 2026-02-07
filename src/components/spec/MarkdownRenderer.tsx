'use client';

import { useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({
    content,
    className = '',
}: MarkdownRendererProps) {
    const [html, setHtml] = useState('');

    useEffect(() => {
        // Custom renderer to add IDs to headings
        const renderer = new marked.Renderer();
        renderer.heading = function ({
            text,
            depth,
        }: {
            text: string;
            depth: number;
        }) {
            const id = text
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');

            return `<h${depth} id="${id}" class="heading-anchor group">
        <a href="#${id}" class="anchor-link opacity-0 group-hover:opacity-100 mr-2 text-blue-400">#</a>
        ${text}
      </h${depth}>\n`;
        };

        marked.setOptions({
            renderer,
            gfm: true,
            breaks: true,
        });

        const rawHtml = marked(content) as string;
        const sanitized = DOMPurify.sanitize(rawHtml, {
            ADD_ATTR: ['id', 'class'],
        });
        setHtml(sanitized);
    }, [content]);

    return (
        <div
            className={`prose prose-invert prose-slate max-w-none ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
