'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { CommentThread } from '@/lib/types';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onCommentClick?: (headingId: string) => void;
  onTextSelect?: (selectedText: string, nearestHeadingId: string) => void;
  onHighlightClick?: (threadId: string) => void;
  threads?: CommentThread[];
  disableHeadingIds?: boolean;
  containerRefCallback?: (ref: React.RefObject<HTMLDivElement | null>) => void;
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
}: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<Section[]>([]);

  // Expose containerRef to parent
  useEffect(() => {
    if (containerRefCallback) containerRefCallback(containerRef);
  }, [containerRefCallback]);

  // Inject highlight marks into HTML strings for quoted text threads
  const highlightedSections = useMemo(() => {
    if (!threads || sections.length === 0) return sections;

    const quotedThreads = threads.filter(t =>
      t.quoted_text &&
      !t.resolved &&
      t.comments?.some(c => !c.deleted)
    );
    if (quotedThreads.length === 0) return sections;

    // HTML-encode text
    const htmlEncode = (text: string) =>
      text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const markTag = (threadId: string, content: string) =>
      `<mark class="quoted-highlight bg-amber-100 dark:bg-amber-900/40 rounded-sm cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors px-0.5" data-thread-id="${threadId}" title="Click to view comment">${content}</mark>`;

    // Helper to highlight a single HTML string
    const highlightHtml = (html: string | undefined): string | undefined => {
      if (!html) return html;

      let processedHtml = html;

      for (const thread of quotedThreads) {
        const searchText = thread.quoted_text!;
        const encodedSearch = htmlEncode(searchText);
        const threadId = thread.id;

        if (searchText.includes('format')) {
          const codeIdx = processedHtml.indexOf('language-json');
          if (codeIdx !== -1) {
            console.log('[HIGHLIGHT DEBUG FOUND JSON]', {
              searchText,
              encodedSearch,
              indexInHtml: processedHtml.indexOf(encodedSearch),
              htmlSnippet: processedHtml.substring(codeIdx, codeIdx + 300)
            });
          }
        }

        // 1. Direct search on the full HTML string (fastest, covers code blocks & inline text)
        const idx = processedHtml.indexOf(encodedSearch);
        if (idx !== -1) {
          const matched = processedHtml.substring(idx, idx + encodedSearch.length);
          processedHtml = processedHtml.substring(0, idx) + markTag(threadId, matched) + processedHtml.substring(idx + encodedSearch.length);
          continue;
        }

        // 2. Fallback: whitespace-normalized search (covers text with newlines/spaces)
        // Build a mapping from positions in a "text-only" version to the original HTML
        let textOnly = '';
        const posMap: number[] = []; // textOnly index -> html index

        let inTag = false;
        for (let i = 0; i < processedHtml.length; i++) {
          if (processedHtml[i] === '<') { inTag = true; continue; }
          if (processedHtml[i] === '>') { inTag = false; continue; }
          if (!inTag) {
            posMap.push(i);
            textOnly += processedHtml[i];
          }
        }

        const normalizedText = textOnly.replace(/\s+/g, ' ');
        const normalizedSearch = encodedSearch.replace(/\s+/g, ' ');
        const normIdx = normalizedText.indexOf(normalizedSearch);
        if (normIdx === -1) continue;

        // Map from normalized position back to textOnly position
        let textIdx = 0;
        let normPos = 0;

        // Advance to start of match
        while (normPos < normIdx && textIdx < textOnly.length) {
          if (/\s/.test(textOnly[textIdx])) {
            textIdx++;
            // Skip all consecutive whitespace in textOnly to match one space in normalized
            while (textIdx < textOnly.length && /\s/.test(textOnly[textIdx])) textIdx++;
            normPos++;
          } else {
            textIdx++;
            normPos++;
          }
        }
        const startTextIdx = textIdx;

        // Find end of match
        let endNormPos = normPos;
        while (endNormPos < normIdx + normalizedSearch.length && textIdx < textOnly.length) {
          if (/\s/.test(textOnly[textIdx])) {
            textIdx++;
            while (textIdx < textOnly.length && /\s/.test(textOnly[textIdx])) textIdx++;
            endNormPos++;
          } else {
            textIdx++;
            endNormPos++;
          }
        }

        // Map textOnly range to HTML range
        if (startTextIdx < posMap.length && textIdx - 1 < posMap.length) {
          const htmlStart = posMap[startTextIdx];
          const htmlEnd = posMap[textIdx - 1] + 1; // +1 to include the last char

          // Verify and replace
          const matched = processedHtml.substring(htmlStart, htmlEnd);
          processedHtml = processedHtml.substring(0, htmlStart) + markTag(threadId, matched) + processedHtml.substring(htmlEnd);
        }
      }
      return processedHtml;
    };

    return sections.map(section => ({
      ...section,
      contentHtml: highlightHtml(section.contentHtml),
      titleHtml: highlightHtml(section.titleHtml) || '',
    }));
  }, [sections, threads]);

  // Handle clicks on highlighted marks
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onHighlightClick) return;

    const handleHighlightClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('quoted-highlight') && target.dataset.threadId) {
        onHighlightClick(target.dataset.threadId);
      }
    };

    container.addEventListener('click', handleHighlightClick);
    return () => container.removeEventListener('click', handleHighlightClick);
  }, [onHighlightClick, highlightedSections]);

  // 1. Configure Marked Renderer (Same as before for consistency)
  const renderer = useMemo(() => {
    const r = new marked.Renderer();

    // Custom code renderer
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
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
            <pre class="!mt-0 !rounded-t-none border border-t-0 border-slate-200 dark:border-slate-700"><code class="language-${language}">${escapedCode}</code></pre>
          </div>`;
    };

    // Custom heading renderer purely for inner content if needed, 
    // but we'll largely handle headers manually in the React component loop
    // to attach sticky/collapse logic. 
    // However, we still need this renderer when we call marked.parser() for the BODY content
    // to ensure nested headers (if any) are rendered correctly? 
    // Actually, our grouping logic effectively pulls headers out. 
    // If we only stick *top level* headers encountered in the loop, nested ones inside "content" might remain.

    return r;
  }, []);

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
  });

  // 2. Parse and Group
  useEffect(() => {
    const tokens = marked.lexer(content);
    const newSections: Section[] = [];
    let currentTokens: any[] = [];
    let currentHeader: any = null;

    // Helper to finalize a section
    const pushSection = () => {
      if (currentHeader || currentTokens.length > 0) {
        // Determine ID and Title HTML
        let id = '';
        let titleHtml = '';
        let level = 0;

        if (currentHeader) {
          const text = currentHeader.text;
          level = currentHeader.depth;
          if (!disableHeadingIds) {
            id = text
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/[\s_-]+/g, '-')
              .replace(/^-+|-+$/g, '');
          }
          // Render just the heading text/content via inline lexer not available?
          // marked.parseInline(text) ???
          // We can just use the token.text, but it might have markdown.
          // Let's use marked.parse(text) but strip <p>.
          titleHtml = String(marked.parse(text)).replace(/^<p>|<\/p>\n?$/g, '');
        } else {
          // Intro section (no header)
          id = 'intro';
          level = 0;
        }

        // Render body
        // We must use marked.parser(tokens) to get HTML
        // But marked.parser expects a "TokensList" which has .links
        const bodyTokens: any = [...currentTokens];
        bodyTokens.links = (tokens as any).links;
        const contentHtml = DOMPurify.sanitize(marked.parser(bodyTokens), {
          ADD_ATTR: ['id', 'class', 'data-code'],
        });

        newSections.push({
          id,
          level,
          titleHtml,
          contentHtml,
          tokens: currentTokens,
        });
      }
    };

    for (const token of tokens) {
      if (token.type === 'heading') {
        // If we have content accumulating, push it as the previous section
        pushSection();

        // Start new section
        currentHeader = token;
        currentTokens = [];
      } else {
        currentTokens.push(token);
      }
    }
    // Push final section
    pushSection();

    setSections(newSections);
  }, [content, disableHeadingIds, renderer]);

  // Handle click events (delegated)
  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // ... (Same Copy/Visualise/Comment logic as before) ...
    const copyBtn = target.closest('.copy-btn') as HTMLButtonElement;
    const visualiseBtn = target.closest('.visualise-btn') as HTMLButtonElement;
    const commentBtn = target.closest('.comment-trigger') as HTMLButtonElement;

    // ... Copy Logic ...
    if (copyBtn) {
      const code = copyBtn.dataset.code || '';
      const decodedCode = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      navigator.clipboard.writeText(decodedCode).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg class="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>Copied!`;
        copyBtn.classList.add('bg-green-200', 'dark:bg-green-500/20', 'text-green-600', 'dark:text-green-400', '!text-green-600');
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.classList.remove('bg-green-200', 'dark:bg-green-500/20', 'text-green-600', 'dark:text-green-400', '!text-green-600');
        }, 2000);
      });
    }

    // ... Visualise Logic ...
    if (visualiseBtn) {
      e.preventDefault();
      const code = visualiseBtn.dataset.code || '';
      try {
        const decodedCode = decodeURIComponent(code);
        if (!decodedCode.trim()) { alert('Diagram code is empty.'); return; }
        const key = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(key, decodedCode);
        window.open(`/tools/mermaid?key=${key}`, '_blank');
      } catch (err) {
        console.error('Failed to visualize', err);
      }
    }

    // ... Comment Trigger Logic ...
    if (commentBtn && onCommentClick) {
      e.preventDefault();
      e.stopPropagation();
      const headingId = commentBtn.dataset.headingId;
      if (headingId) onCommentClick(headingId);
    }
  }, [onCommentClick]);

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (currentContainer) {
      currentContainer.addEventListener('click', handleClick);
    }
    return () => {
      if (currentContainer) {
        currentContainer.removeEventListener('click', handleClick);
      }
    };
  }, [handleClick, sections]);

  // handle hash scrolling ensuring content is loaded
  useEffect(() => {
    if (sections.length > 0 && typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1); // remove #
      const element = document.getElementById(hash);
      if (element) {
        // small delay to ensure layout is stable
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [sections]);

  return (
    <div ref={containerRef} className={`prose prose-slate dark:prose-invert max-w-none ${className}`}>
      {highlightedSections.map((section, index) => {
        const HeadingTag = (`h${section.level || 1}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

        // If it's the intro section (level 0), just render content without header
        if (section.level === 0) {
          if (!section.contentHtml) return null;
          return (
            <div key={`intro-${index}`} dangerouslySetInnerHTML={{ __html: section.contentHtml }} />
          );
        }

        return (
          <div key={`${section.id}-${index}`} className="section-container">
            <div className="sticky top-16 z-10 -mx-4 px-4 py-1 bg-white dark:bg-[#0B1120] border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center group">
                <HeadingTag
                  id={section.id}
                  className="!m-0 !p-0 !border-0 flex items-center scroll-mt-20"
                >
                  <span dangerouslySetInnerHTML={{ __html: section.titleHtml }} />
                </HeadingTag>

                {/* Anchor Link */}
                <a href={`#${section.id}`} className="flex-shrink-0 opacity-0 group-hover:opacity-100 ml-2 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 !no-underline transition-colors font-normal text-lg">#</a>

                {/* Comment Trigger */}
                {!disableHeadingIds && onCommentClick && (
                  <button
                    className="flex-shrink-0 comment-trigger opacity-0 group-hover:opacity-100 ml-1 text-slate-400 hover:text-blue-600 transition-all transform hover:scale-110 cursor-pointer"
                    data-heading-id={section.id}
                    title="Add comment"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Body Content */}
            {section.contentHtml && (
              <div
                className="section-content pt-4 pb-4"
                dangerouslySetInnerHTML={{ __html: section.contentHtml }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
