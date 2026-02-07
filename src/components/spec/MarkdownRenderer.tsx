'use client';

import { useEffect, useState, useCallback } from 'react';
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
        // Custom renderer to add IDs to headings and wrap code blocks
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

        renderer.code = function ({
            text,
            lang,
        }: {
            text: string;
            lang?: string;
        }) {
            const language = lang || 'text';
            const isMermaid = language === 'mermaid';
            const escapedCode = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

            return `<div class="code-block-wrapper group relative my-4">
        <div class="code-block-header flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-b-0 border-slate-200 dark:border-slate-700 rounded-t-lg">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">${language}</span>
          <div class="flex gap-2">
            ${isMermaid
                    ? `<button type="button" class="mermaid-btn px-2 py-1 text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors" data-mermaid="${escapedCode}">
                <svg class="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Diagram
              </button>`
                    : ''
                }
            <button type="button" class="copy-btn px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors" data-code="${escapedCode}">
              <svg class="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
        </div>
        <pre class="!mt-0 !rounded-t-none border border-t-0 border-slate-200 dark:border-slate-700"><code class="language-${language}">${escapedCode}</code></pre>
      </div>`;
        };

        marked.setOptions({
            renderer,
            gfm: true,
            breaks: true,
        });

        const rawHtml = marked(content) as string;
        const sanitized = DOMPurify.sanitize(rawHtml, {
            ADD_ATTR: ['id', 'class', 'data-code', 'data-mermaid'],
        });
        setHtml(sanitized);
    }, [content]);

    // Handle copy button clicks
    const handleClick = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const copyBtn = target.closest('.copy-btn') as HTMLButtonElement;
        const mermaidBtn = target.closest('.mermaid-btn') as HTMLButtonElement;

        if (copyBtn) {
            const code = copyBtn.dataset.code || '';
            const decodedCode = code
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"');

            navigator.clipboard.writeText(decodedCode).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = `<svg class="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>Copied!`;
                copyBtn.classList.add('bg-green-200', 'dark:bg-green-500/20', 'text-green-600', 'dark:text-green-400');
                copyBtn.classList.remove('bg-slate-200', 'dark:bg-slate-700', 'text-slate-600', 'dark:text-slate-300');

                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.remove('bg-green-200', 'dark:bg-green-500/20', 'text-green-600', 'dark:text-green-400');
                    copyBtn.classList.add('bg-slate-200', 'dark:bg-slate-700', 'text-slate-600', 'dark:text-slate-300');
                }, 2000);
            });
        }

        if (mermaidBtn) {
            // Placeholder - just show an alert for now
            alert('Mermaid diagram rendering will be implemented next!');
        }
    }, []);

    useEffect(() => {
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [handleClick]);

    return (
        <div
            className={`prose prose-slate dark:prose-invert max-w-none ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
