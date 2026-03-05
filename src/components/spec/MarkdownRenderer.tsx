'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { marked } from 'marked';
import { CommentThread } from '@/lib/types';
import {
  getSpecRenderer,
  parseMarkdownToSections,
  applyHighlightsToSections,
  Section
} from '@/lib/spec-utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onCommentClick?: (headingId: string) => void;
  onTextSelect?: (selectedText: string, nearestHeadingId: string) => void;
  onHighlightClick?: (threadId: string) => void;
  threads?: CommentThread[];
  disableHeadingIds?: boolean;
  containerRefCallback?: (ref: React.RefObject<HTMLDivElement | null>) => void;
  frontmatter?: string;
}

export function MarkdownRenderer({
  content,
  className = '',
  onCommentClick,
  onTextSelect,
  onHighlightClick,
  threads,
  disableHeadingIds = false,
  containerRefCallback,
  frontmatter,
}: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<Section[]>([]);

  // Expose containerRef to parent
  useEffect(() => {
    if (containerRefCallback) containerRefCallback(containerRef);
  }, [containerRefCallback]);

  // 1. Configure Marked with our Spec Renderer
  useEffect(() => {
    marked.setOptions({
      renderer: getSpecRenderer(),
      gfm: true,
      breaks: true,
    });
  }, []);

  // 2. Parse Markdown into raw sections
  useEffect(() => {
    const rawSections = parseMarkdownToSections(content, disableHeadingIds);
    setSections(rawSections);
  }, [content, disableHeadingIds]);

  // 3. Apply highlights (Comments only now)
  const processedSections = useMemo(() => {
    return applyHighlightsToSections(sections, threads);
  }, [sections, threads]);

  // Handle click events (delegated for copy-btn, visualise-btn, comment-trigger, etc.)
  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const copyBtn = target.closest('.copy-btn') as HTMLButtonElement;
    const visualiseBtn = target.closest('.visualise-btn') as HTMLButtonElement;
    const commentBtn = target.closest('.comment-trigger') as HTMLButtonElement;
    const highlight = target.closest('.quoted-highlight') as HTMLElement;

    if (copyBtn) {
      const code = copyBtn.dataset.code || '';
      const decodedCode = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      navigator.clipboard.writeText(decodedCode).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `Copied!`;
        setTimeout(() => { copyBtn.innerHTML = originalText; }, 2000);
      });
    }

    if (visualiseBtn) {
      const code = visualiseBtn.dataset.code || '';
      const decodedCode = decodeURIComponent(code);
      const key = `mermaid-${Date.now()}`;
      localStorage.setItem(key, decodedCode);
      window.open(`/tools/mermaid?key=${key}`, '_blank');
    }

    if (commentBtn && onCommentClick) {
      const headingId = commentBtn.dataset.headingId;
      if (headingId) onCommentClick(headingId);
    }

    if (highlight && onHighlightClick && highlight.dataset.threadId) {
      onHighlightClick(highlight.dataset.threadId);
    }
  }, [onCommentClick, onHighlightClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) container.addEventListener('click', handleClick);
    return () => container?.removeEventListener('click', handleClick);
  }, [handleClick]);

  return (
    <div ref={containerRef} className={`prose prose-slate dark:prose-invert max-w-none ${className}`}>
      {frontmatter && (
        <div className="mb-8 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-black/20 p-3">
          <span className="text-xs font-semibold text-slate-500 uppercase font-sans">Frontmatter Metadata</span>
          <pre className="mt-2 text-sm whitespace-pre-wrap font-mono">{frontmatter}</pre>
        </div>
      )}
      {processedSections.map((section, index) => {
        const HeadingTag = (`h${section.level || 1}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

        return (
          <div key={`${section.id}-${index}`} className="section-container mb-8 rounded-lg transition-colors">
            {section.level > 0 && (
              <div className="sticky top-16 z-10 py-4 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-md flex items-center group [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]">
                <HeadingTag id={section.id} className="!m-0 scroll-mt-20">
                  <span dangerouslySetInnerHTML={{ __html: section.titleHtml }} />
                </HeadingTag>
                <a href={`#${section.id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-slate-300 transition-opacity">#</a>
                {!disableHeadingIds && onCommentClick && (
                  <button
                    className="comment-trigger opacity-0 group-hover:opacity-100 ml-2 text-slate-400 hover:text-blue-500 transition-colors"
                    data-heading-id={section.id}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
                  </button>
                )}
              </div>
            )}
            <div className="section-content pt-4 pb-4 px-2" dangerouslySetInnerHTML={{ __html: section.contentHtml }} />
          </div>
        );
      })}
    </div>
  );
}
