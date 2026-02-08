'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onCommentClick?: (headingId: string) => void;
  disableHeadingIds?: boolean;
}

export function MarkdownRenderer({
  content,
  className = '',
  onCommentClick,
  disableHeadingIds = false,
}: MarkdownRendererProps) {
  const [html, setHtml] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

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
      if (disableHeadingIds) {
        return `<h${depth} class="font-bold my-2">${text}</h${depth}>\n`;
      }

      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const commentBtn = onCommentClick ?
        `<button class="comment-trigger opacity-0 group-hover:opacity-100 ml-2 text-slate-400 hover:text-blue-500 transition-opacity" data-heading-id="${id}" title="Add comment">
           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
         </button>` : '';

      return `<h${depth} id="${id}" class="heading-anchor group flex items-center">
        <a href="#${id}" class="anchor-link opacity-0 group-hover:opacity-100 mr-2 text-blue-400 no-underline">#</a>
        <span>${text}</span>
        ${commentBtn}
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

      if (isMermaid) {
        const encodedCode = encodeURIComponent(text);
        // We still use escapedCode for display, but encodedCode for data attributes

        return `<div class="code-block-wrapper group relative my-4">
        <div class="code-block-header flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-b-0 border-slate-200 dark:border-slate-700 rounded-t-lg">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">mermaid</span>
          <div class="flex gap-2">
            <button type="button" class="visualise-btn px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 !text-slate-600 dark:!text-slate-300 !no-underline rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-1" data-code="${encodedCode}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Visualise
            </button>
            <button type="button" class="copy-btn px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors" data-code="${escapedCode}">
              <svg class="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
        </div>
        <pre class="!mt-0 !rounded-t-none border border-t-0 border-slate-200 dark:border-slate-700"><code class="language-mermaid">${escapedCode}</code></pre>
      </div>`;
      }

      return `<div class="code-block-wrapper group relative my-4">
        <div class="code-block-header flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-b-0 border-slate-200 dark:border-slate-700 rounded-t-lg">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">${language}</span>
          <div class="flex gap-2">
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
      ADD_ATTR: ['id', 'class', 'data-code'],
    });
    setHtml(sanitized);
  }, [content]);

  // Handle click events for both copy and visualise buttons
  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const copyBtn = target.closest('.copy-btn') as HTMLButtonElement;
    const visualiseBtn = target.closest('.visualise-btn') as HTMLButtonElement;

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

    if (visualiseBtn) {
      // ... existing visualise logic ...
      e.preventDefault();
      const code = visualiseBtn.dataset.code || '';
      let decodedCode = '';

      try {
        decodedCode = decodeURIComponent(code);
      } catch (e) {
        console.error('Failed to decode diagram code:', e);
        alert('Failed to decode diagram code.');
        return;
      }

      if (!decodedCode.trim()) {
        alert('Diagram code is empty.');
        return;
      }

      // Generate a simple unique key
      const key = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        localStorage.setItem(key, decodedCode);

        // precise verification
        const verified = localStorage.getItem(key);
        if (verified === null) {
          throw new Error('Verification failed: Item not found in storage immediately after writing');
        }

        window.open(`/tools/mermaid?key=${key}`, '_blank');
      } catch (err) {
        console.error('Failed to save diagram to localStorage', err);
        alert('Failed to open diagram: storage write failed. ' + err);
      }
    }

    // Handle Comment Trigger
    const commentBtn = target.closest('.comment-trigger') as HTMLButtonElement;
    if (commentBtn && onCommentClick) {
      e.preventDefault();
      e.stopPropagation();
      const headingId = commentBtn.dataset.headingId;
      if (headingId) {
        onCommentClick(headingId);
      }
    }
  }, [onCommentClick]);

  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleClick]);

  return (
    <div
      ref={containerRef}
      className={`prose prose-slate dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
