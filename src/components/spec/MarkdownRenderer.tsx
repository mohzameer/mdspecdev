'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { CommentThread } from '@/lib/types';

import { getMatchKey } from '@/lib/diff-utils';

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
  addedLines?: Set<string>;
  modifiedLines?: Set<string>;
}

interface Section {
  id: string;
  level: number;
  titleHtml: string;
  contentHtml: string;
  tokens: any[];
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
  addedLines,
  modifiedLines,
}: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [showFrontmatter, setShowFrontmatter] = useState(false);

  // Expose containerRef to parent
  useEffect(() => {
    if (containerRefCallback) containerRefCallback(containerRef);
  }, [containerRefCallback]);

  // 1. Configure Marked Renderer
  const renderer = useMemo(() => {
    const r = new marked.Renderer();

    r.code = function ({ text, lang }) {
      const language = lang || 'text';
      const isMermaid = language === 'mermaid';
      const escapedCode = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      if (isMermaid) {
        const encodedCode = encodeURIComponent(text);
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
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 002 2z" />
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
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2-2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
            <pre class="!mt-0 !rounded-t-none border border-t-0 border-slate-200 dark:border-slate-700"><code class="language-${language}">${escapedCode}</code></pre>
          </div>`;
    };

    return r;
  }, []);

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
  });

  // 2. Parse and Group tokens into sections
  useEffect(() => {
    const tokens = marked.lexer(content);
    const newSections: Section[] = [];
    let currentTokens: any[] = [];
    let currentHeader: any = null;

    const pushSection = () => {
      if (currentHeader || currentTokens.length > 0) {
        let id = '';
        let titleHtml = '';
        let level = 0;

        if (currentHeader) {
          const text = currentHeader.text;
          level = currentHeader.depth;
          if (!disableHeadingIds) {
            id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
          }
          titleHtml = String(marked.parse(text)).replace(/^<p>|<\/p>\n?$/g, '');
        } else {
          id = 'intro';
          level = 0;
        }

        const bodyTokens: any = [...currentTokens];
        bodyTokens.links = (tokens as any).links;
        const contentHtml = DOMPurify.sanitize(marked.parser(bodyTokens), {
          ADD_ATTR: ['id', 'class', 'data-code'],
        });

        newSections.push({ id, level, titleHtml, contentHtml, tokens: [...currentTokens] });
      }
    };

    for (const token of tokens) {
      if (token.type === 'heading') {
        pushSection();
        currentHeader = token;
        currentTokens = [];
      } else {
        currentTokens.push(token);
      }
    }
    pushSection();
    setSections(newSections);
  }, [content, disableHeadingIds, renderer]);

  // 3. Inject highlights (Comments & Diffs)
  const processedSections = useMemo(() => {
    let result = sections.map(s => ({ ...s }));
    const keyCounter = new Map<string, number>();

    // A. Quoted text threads (comment marks)
    if (threads && threads.length > 0) {
      const quotedThreads = threads.filter(t => t.quoted_text && !t.resolved && t.comments?.some(c => !c.deleted));
      if (quotedThreads.length > 0) {
        const htmlEncode = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const markTag = (threadId: string, content: string) => `<mark class="quoted-highlight bg-amber-100 dark:bg-amber-900/40 rounded-sm cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors px-0.5" data-thread-id="${threadId}">${content}</mark>`;

        result = result.map(section => {
          for (const thread of quotedThreads) {
            const searchText = thread.quoted_text!;
            const encodedSearch = htmlEncode(searchText);
            const idx = section.contentHtml.indexOf(encodedSearch);
            if (idx !== -1) {
              const matched = section.contentHtml.substring(idx, idx + encodedSearch.length);
              section.contentHtml = section.contentHtml.substring(0, idx) + markTag(thread.id, matched) + section.contentHtml.substring(idx + encodedSearch.length);
            }
          }
          return section;
        });
      }
    }

    // B. Diff highlights (Added/Modified blocks and headings)
    if (addedLines?.size || modifiedLines?.size) {
      result = result.map(section => {
        // First handle the heading (level > 0 sections)
        if (section.level > 0) {
          const strippedTitle = section.titleHtml.replace(/<[^>]+>/g, '').trim();
          const key = getMatchKey(strippedTitle);
          if (key) {
            const occurrence = (keyCounter.get(key) || 0);
            keyCounter.set(key, occurrence + 1);
            const posId = `${key}_${occurrence}`;

            // We'll add custom attributes to the section itself or its titleHtml
            if (addedLines?.has(posId)) (section as any).diffClass = 'diff-line-added';
            else if (modifiedLines?.has(posId)) (section as any).diffClass = 'diff-line-modified';
          }
        }

        // Then handle the content blocks
        section.contentHtml = section.contentHtml.replace(/<(p|li)([^>]*)>([\s\S]*?)<\/\1>/g, (match, tag, attrs, inner) => {
          const stripped = inner.replace(/<[^>]+>/g, '').trim();
          const key = getMatchKey(stripped);
          if (!key) return match;

          const occurrence = (keyCounter.get(key) || 0);
          keyCounter.set(key, occurrence + 1);
          const posId = `${key}_${occurrence}`;

          const isAdded = addedLines?.has(posId);
          const isModified = modifiedLines?.has(posId);

          if (isAdded || isModified) {
            console.log(`[RendererMatch] Match! "${stripped.substring(0, 30)}..." | posId: ${posId} | added: ${isAdded}, modified: ${isModified}`);
          }

          if (isAdded) {
            return `<${tag}${attrs} class="diff-line-added">${inner}</${tag}>`;
          }
          if (isModified) {
            return `<${tag}${attrs} class="diff-line-modified">${inner}</${tag}>`;
          }
          return match;
        });
        return section;
      });
    }

    return result;
  }, [sections, threads, addedLines, modifiedLines]);

  // Handle click events (delegated)
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
          <span className="text-xs font-semibold text-slate-500 uppercase">Frontmatter Metadata</span>
          <pre className="mt-2 text-sm whitespace-pre-wrap font-mono">{frontmatter}</pre>
        </div>
      )}
      {processedSections.map((section, index) => {
        const HeadingTag = (`h${section.level || 1}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
        const diffClass = (section as any).diffClass || '';

        return (
          <div key={`${section.id}-${index}`} className={`section-container mb-8 rounded-lg transition-colors ${diffClass}`}>
            {section.level > 0 && (
              <div className={`sticky top-16 z-10 py-1 bg-white dark:bg-[#0B1120] border-b border-slate-100 dark:border-slate-800 flex items-center group ${diffClass}`}>
                <HeadingTag id={section.id} className={`!m-0 scroll-mt-20 ${diffClass}`}>
                  <span dangerouslySetInnerHTML={{ __html: section.titleHtml }} />
                </HeadingTag>
                <a href={`#${section.id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-slate-300">#</a>
                {!disableHeadingIds && onCommentClick && (
                  <button
                    className="comment-trigger opacity-0 group-hover:opacity-100 ml-2 text-slate-400 hover:text-blue-500"
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
