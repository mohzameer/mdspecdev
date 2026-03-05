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
  content?: string;
  className?: string;
  onCommentClick?: (headingId: string) => void;
  onTextSelect?: (selectedText: string, nearestHeadingId: string) => void;
  onHighlightClick?: (threadId: string) => void;
  threads?: CommentThread[];
  disableHeadingIds?: boolean;
  containerRefCallback?: (ref: React.RefObject<HTMLDivElement | null>) => void;
  frontmatter?: string;
  precomputedSections?: Section[];
}

export function MarkdownRenderer({
  content = '',
  className = '',
  onCommentClick,
  onTextSelect,
  onHighlightClick,
  threads,
  disableHeadingIds = false,
  containerRefCallback,
  frontmatter,
  precomputedSections,
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

  // 2. Parse Markdown into raw sections or use precomputed
  useEffect(() => {
    if (precomputedSections) {
      setSections(precomputedSections);
    } else {
      const rawSections = parseMarkdownToSections(content, disableHeadingIds);
      setSections(rawSections);
    }
  }, [content, precomputedSections, disableHeadingIds]);

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
    <div ref={containerRef} className={`prose prose-slate dark:prose-invert max-w-none prose-h1:text-3xl md:prose-h1:text-4xl prose-h2:text-2xl md:prose-h2:text-3xl ${className}`}>
      {frontmatter && (
        <div className="mb-8 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-black/20 p-3">
          <span className="text-xs font-semibold text-slate-500 uppercase font-sans">Frontmatter Metadata</span>
          <pre className="mt-2 text-sm whitespace-pre-wrap font-mono">{frontmatter}</pre>
        </div>
      )}
      {processedSections.map((section, index) => {
        const HeadingTag = (`h${section.level || 1}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

        return (
          <div key={`${section.id}-${index}`} className="section-container mb-2 rounded-lg transition-colors">
            {section.level > 0 && (
              <div className="sticky top-16 z-10 pt-4 pb-2 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-md flex items-center group [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]">
                <HeadingTag id={section.id} className="!m-0 scroll-mt-20">
                  <span dangerouslySetInnerHTML={{ __html: section.titleHtml }} />
                </HeadingTag>
                <a href={`#${section.id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-slate-300 transition-opacity">#</a>
              </div>
            )}
            <div className="section-content pt-2 pb-4 px-2" dangerouslySetInnerHTML={{ __html: section.contentHtml }} />
          </div>
        );
      })}
    </div>
  );
}
