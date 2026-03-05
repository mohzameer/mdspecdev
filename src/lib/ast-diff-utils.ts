import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { diff_match_patch } from 'diff-match-patch';

function getNodeText(node: any): string {
    if (node.value) return node.value;
    if (node.children) return node.children.map(getNodeText).join('');
    return '';
}

/**
 * Remark plugin that compares the current tree against an `oldMarkdown` tree
 * and decorates changed properties.
 */
export function remarkAstDiff(options: { oldMarkdown?: string }) {
    return (tree: any) => {
        if (!options.oldMarkdown) return;

        const oldTree = unified().use(remarkParse).use(remarkGfm).parse(options.oldMarkdown);

        // Build a multiset of texts from the old tree for block-level comparison
        const oldBlocks = new Map<string, number>();
        visit(oldTree, (node: any) => {
            if (['paragraph', 'heading', 'code', 'blockquote', 'listItem', 'table'].includes(node.type)) {
                // Avoid matching leaf nodes recursively if we already matched parent?
                // For simplicity, collect everything.
                const text = getNodeText(node).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                if (text) {
                    oldBlocks.set(text, (oldBlocks.get(text) || 0) + 1);
                }
            }
        });

        // Traverse the current (new) tree
        visit(tree, (node: any) => {
            const matchableTypes = ['paragraph', 'heading', 'code', 'blockquote', 'listItem', 'table'];
            const isMatchable = matchableTypes.includes(node.type);

            // Only examine block nodes without further matchable block children to prevent all parents being marked
            const hasMatchableChildren = (node.children || []).some((c: any) =>
                matchableTypes.includes(c.type)
            );

            if (isMatchable && !hasMatchableChildren) {
                const text = getNodeText(node).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                if (text) {
                    const count = oldBlocks.get(text);
                    if (count && count > 0) {
                        // Found an exact match in the old text
                        oldBlocks.set(text, count - 1);
                    } else {
                        // Not found -> it's an addition or modification
                        // Add class: "diff-added"
                        node.data = node.data || {};
                        node.data.hProperties = node.data.hProperties || {};
                        const currentClass = node.data.hProperties.className || '';
                        node.data.hProperties.className = `${currentClass} diff-line-added`.trim();
                    }
                }
            }
        });

        // Optionally, we could append nodes that were in oldTree but NOT in newTree as "diff-deleted"
        // and insert them at the end of the document, or attempt to interleave them.
        // For now, we will highlight just the additions.
    };
}

/**
 * Utility to process markdown into a diff-highlighted HTML string using AST comparison.
 */
export async function computeAstDiffHtml(oldMarkdown: string, newMarkdown: string): Promise<string> {
    const oldTree = unified().use(remarkParse).parse(oldMarkdown); // Parse oldMarkdown to oldTree for remarkAstDiff
    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm) // Added remarkGfm
        .use(remarkAstDiff, { oldMarkdown }) // Kept oldMarkdown as per remarkAstDiff signature
        .use(remarkRehype, { allowDangerousHtml: true }) // Added allowDangerousHtml
        .use(rehypeStringify, { allowDangerousHtml: true }); // Added allowDangerousHtml

    const file = await processor.process(newMarkdown);

    return String(file);
}

export interface AstSection {
    id: string;
    level: number;
    titleHtml: string;
    contentHtml: string;
}

/**
 * Utility to process markdown into diff-highlighted AstSections.
 * This mirrors the section splitting used in standard MarkdownRenderer so we get sticky headers!
 */
export async function computeAstDiffSections(oldMarkdown: string, newMarkdown: string): Promise<AstSection[]> {
    const oldTree = unified().use(remarkParse).use(remarkGfm).parse(oldMarkdown);
    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkAstDiff, { oldMarkdown });

    // Parse and run plugins to get the decorated MDAST
    const parsed = processor.parse(newMarkdown);
    const mdast = await processor.run(parsed);

    const sections: AstSection[] = [];
    let currentChunk: any[] = [];
    let currentHeading: any = null;

    const renderMdastToHtml = (mdastRoot: any) => {
        const hast = unified().use(remarkRehype, { allowDangerousHtml: true }).runSync(mdastRoot);
        return unified().use(rehypeStringify, { allowDangerousHtml: true }).stringify(hast);
    };

    const pushSection = () => {
        if (currentHeading || currentChunk.length > 0) {
            let id = 'intro';
            let level = 0;
            let titleHtml = '';

            if (currentHeading) {
                level = currentHeading.depth;
                const headingText = getNodeText(currentHeading);
                id = headingText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

                // Render just the heading content
                titleHtml = renderMdastToHtml({ type: 'root', children: currentHeading.children });
            }

            const contentHtml = renderMdastToHtml({ type: 'root', children: currentChunk });

            sections.push({
                id,
                level,
                titleHtml,
                contentHtml
            });
        }
    };

    for (const node of (mdast as any).children) {
        if (node.type === 'heading') {
            pushSection();
            currentHeading = node;
            currentChunk = [];
        } else {
            currentChunk.push(node);
        }
    }
    pushSection();

    return sections;
}
