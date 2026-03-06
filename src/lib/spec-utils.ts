import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { CommentThread } from '@/lib/types';
import { getMatchKey } from './diff-utils';

export interface Section {
    id: string;
    level: number;
    titleHtml: string;
    rawTitle?: string;
    contentHtml: string;
    tokens: any[];
    diffClass?: string;
    hasHeaderComment?: boolean;
    hasHeaderDiff?: boolean;
}

/**
 * Custom marked renderer that handles mermaid, code blocks, AND diff/comment highlights via token metadata.
 */
export function getSpecRenderer() {
    const r = new marked.Renderer();

    // 1. Code blocks (Mermaid & Copy)
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
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2-2v8a2 2 0 002 2z" />
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

    // 2. Paragraphs with optional diff mapping
    r.paragraph = function (token: any) {
        const text = this.parser.parseInline(token.tokens);
        const cls = token.diffClass ? ` class="${token.diffClass}"` : '';
        return `<p${cls}>${text}</p>\n`;
    };

    // 3. List items with optional diff mapping
    r.listitem = function (token: any) {
        const text = this.parser.parse(token.tokens);
        const cls = token.diffClass ? ` class="list-none ${token.diffClass}"` : '';
        return `<li${cls}>${text}</li>\n`;
    };

    return r;
}

/**
 * Parses markdown into sequential sections separated by headers.
 */
export function parseMarkdownToSections(content: string, disableHeadingIds: boolean = false): Section[] {
    const renderer = getSpecRenderer();
    marked.setOptions({ renderer, gfm: true, breaks: true });

    const tokens = marked.lexer(content);
    const sections: Section[] = [];
    let currentTokens: any[] = [];
    let currentHeader: any = null;

    const pushSection = () => {
        if (currentHeader || currentTokens.length > 0) {
            let id = '';
            let titleHtml = '';
            let rawTitle = '';
            let level = 0;

            if (currentHeader) {
                level = currentHeader.depth;
                rawTitle = currentHeader.text;
                if (!disableHeadingIds) {
                    id = currentHeader.text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
                }
                titleHtml = marked.parseInline(currentHeader.text) as string;
            } else {
                id = 'intro';
                level = 0;
            }

            const bodyTokens: any = [...currentTokens];
            bodyTokens.links = (tokens as any).links;

            // Generate initial clean HTML
            const contentHtml = DOMPurify.sanitize(marked.parser(bodyTokens) as string, {
                ADD_ATTR: ['id', 'class', 'data-code'],
            });

            sections.push({
                id,
                level,
                titleHtml,
                rawTitle,
                contentHtml,
                tokens: bodyTokens
            });
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
    return sections;
}

/**
 * Applies comment highlights and diff highlights to a list of sections using TOKEN manipulation.
 * Also bubbles up highlights to the section level for "section-based highlighting".
 */
export function applyHighlightsToSections(
    sections: Section[],
    threads: CommentThread[] = [],
    addedLines?: Set<string>,
    modifiedLines?: Set<string>
): Section[] {
    const keyCounter = new Map<string, number>();
    const renderer = getSpecRenderer();
    marked.setOptions({ renderer, gfm: true, breaks: true });

    return sections.map(section => {
        const updatedSection = { ...section };
        let sectionHasAddition = false;
        let sectionHasModification = false;

        // 1. Diffs: Traverse tokens and attach diffClass
        const processTokenDiffs = (tokens: any[]) => {
            for (const token of tokens) {
                const isMatchable = ['paragraph', 'list_item', 'heading', 'blockquote'].includes(token.type);
                const hasMatchableChildren = (token.tokens || token.items)?.some((t: any) =>
                    ['paragraph', 'list_item', 'heading'].includes(t.type)
                );

                if (isMatchable && !hasMatchableChildren) {
                    const rawText = token.text || token.raw;
                    const key = getMatchKey(rawText);
                    if (key) {
                        const occurrence = (keyCounter.get(key) || 0);
                        keyCounter.set(key, occurrence + 1);
                        const posId = `${key}_${occurrence}`;

                        const isAdded = addedLines?.has(posId);
                        const isModified = modifiedLines?.has(posId);

                        if (isAdded || isModified) {
                            console.log(`[RendererMatch] Block Match! "${rawText.substring(0, 30)}..." | posId: ${posId} | added: ${isAdded}, modified: ${isModified}`);
                            if (isAdded) {
                                token.diffClass = 'diff-line-added';
                                sectionHasAddition = true;
                            } else if (isModified) {
                                token.diffClass = 'diff-line-modified';
                                sectionHasModification = true;
                            }
                        }
                    }
                }

                if (token.tokens) processTokenDiffs(token.tokens);
                if (token.items) processTokenDiffs(token.items);
            }
        };

        // Handle section header diff
        if (updatedSection.level > 0 && updatedSection.rawTitle) {
            const key = getMatchKey(updatedSection.rawTitle);
            if (key) {
                const occurrence = (keyCounter.get(key) || 0);
                keyCounter.set(key, occurrence + 1);
                const posId = `${key}_${occurrence}`;

                const isAdded = addedLines?.has(posId);
                const isModified = modifiedLines?.has(posId);

                if (isAdded || isModified) {
                    console.log(`[RendererMatch] Header Match! "${updatedSection.rawTitle.substring(0, 30)}" | posId: ${posId} | added: ${isAdded}, modified: ${isModified}`);
                    if (isAdded || isModified) {
                        updatedSection.hasHeaderDiff = true;
                    }
                }
            }
        }

        let contentHtml = updatedSection.contentHtml || '';

        if (updatedSection.tokens) {
            // Handle body tokens diff
            processTokenDiffs(updatedSection.tokens);

            // 2. Re-render contentHtml from modified tokens
            const rawHtml = marked.parser(updatedSection.tokens) as string;
            contentHtml = DOMPurify.sanitize(rawHtml, {
                ADD_ATTR: ['id', 'class', 'data-code'],
            });
        }

        let titleHtml = updatedSection.titleHtml || '';

        // 3. Anchor-based Header Comments Highlighting
        if (threads.length > 0) {
            const activeHeaderThreads = threads.filter(t =>
                t.anchor_heading_id === updatedSection.id &&
                !t.resolved &&
                t.comments?.some(c => !c.deleted)
            );

            if (activeHeaderThreads.length > 0) {
                updatedSection.hasHeaderComment = true;
                const threadId = activeHeaderThreads[0].id;
                titleHtml = `<mark class="quoted-highlight bg-yellow-100/60 dark:bg-yellow-900/30 rounded-sm cursor-pointer hover:bg-yellow-200/70 dark:hover:bg-yellow-800/40 transition-colors px-0.5 text-inherit" data-thread-id="${threadId}">${titleHtml}</mark>`;
            }
        }

        // Apply fallback header diff text styling
        if (updatedSection.hasHeaderDiff && !updatedSection.hasHeaderComment) {
            titleHtml = `<span class="bg-yellow-100/40 dark:bg-yellow-900/20 rounded-sm px-0.5">${titleHtml}</span>`;
        }

        // 4. Quoted text threads for Content (legacy regex approach)
        if (threads.length > 0) {
            const quotedThreads = threads.filter(t => t.quoted_text && !t.resolved && t.comments?.some(c => !c.deleted));
            if (quotedThreads.length > 0) {
                const htmlEncode = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                const markTag = (threadId: string, content: string) => `<mark class="quoted-highlight bg-amber-100 dark:bg-amber-900/40 rounded-sm cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors px-0.5" data-thread-id="${threadId}">${content}</mark>`;

                for (const thread of quotedThreads) {
                    const encodedSearch = htmlEncode(thread.quoted_text!);

                    // Only search inside contentHtml, titleHtml is fully managed by anchor IDs above
                    const idx = contentHtml.indexOf(encodedSearch);
                    if (idx !== -1) {
                        const matched = contentHtml.substring(idx, idx + encodedSearch.length);
                        contentHtml = contentHtml.substring(0, idx) + markTag(thread.id, matched) + contentHtml.substring(idx + encodedSearch.length);
                    }
                }
            }
        }

        updatedSection.titleHtml = titleHtml;

        updatedSection.contentHtml = contentHtml;
        return updatedSection;
    });
}
