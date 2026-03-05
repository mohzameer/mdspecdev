import { diff_match_patch } from 'diff-match-patch';
import { marked } from 'marked';

/**
 * Normalizes text to a "match key" by converting to lowercase and 
 * stripping all non-alphanumeric characters. 
 */
export function getMatchKey(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface DiffResult {
    addedLines: Set<string>;
    modifiedLines: Set<string>;
}

/**
 * Computes which blocks in newContent are added or modified relative to oldContent.
 */
export function computePositionalDiffs(oldContent: string, newContent: string): DiffResult {
    const dmp = new diff_match_patch();
    const oldText = oldContent.replace(/\r\n/g, '\n');
    const newText = newContent.replace(/\r\n/g, '\n');

    const diffs = dmp.diff_main(oldText, newText);
    dmp.diff_cleanupSemantic(diffs);

    const addedLines = new Set<string>();
    const modifiedLines = new Set<string>();

    const tokens = marked.lexer(newText);
    const keyCounter = new Map<string, number>();

    let currentOffset = 0;

    const processTokens = (toks: any[]) => {
        for (const token of toks) {
            const tokenStart = currentOffset;
            const tokenEnd = currentOffset + token.raw.length;

            // Only match "renderable" block types to avoid redundant parent/child matches
            const isMatchable = ['paragraph', 'list_item', 'heading', 'blockquote'].includes(token.type);
            const hasMatchableChildren = (token.tokens || token.items)?.some((t: any) =>
                ['paragraph', 'list_item', 'heading'].includes(t.type)
            );

            // If it's matchable AND doesn't have block-level matchable children, match it.
            // This prevents doubling up on list_item -> paragraph.
            if (isMatchable && !hasMatchableChildren) {
                const rawText = token.text || token.raw;
                const key = getMatchKey(rawText);
                if (key) {
                    const occurrence = (keyCounter.get(key) || 0);
                    keyCounter.set(key, occurrence + 1);
                    const posId = `${key}_${occurrence}`;

                    let addedChars = 0;
                    let deletedChars = 0;
                    let significantUnchangedChars = 0;
                    let charPos = 0;

                    for (const [op, dText] of diffs) {
                        const chunkStart = charPos;
                        const chunkEnd = charPos + dText.length;
                        charPos += dText.length;

                        if (chunkEnd > tokenStart && chunkStart < tokenEnd) {
                            const overlapStart = Math.max(chunkStart, tokenStart);
                            const overlapEnd = Math.min(chunkEnd, tokenEnd);
                            const overlapText = dText.substring(overlapStart - chunkStart, overlapEnd - chunkStart);

                            if (op === 1) addedChars += overlapText.length;
                            else if (op === -1) deletedChars += overlapText.length;
                            else if (op === 0 && overlapText.trim().length > 0) {
                                significantUnchangedChars += overlapText.length;
                            }
                        }
                    }

                    if (addedChars > 0) {
                        const totalTokenChars = rawText.length;
                        const addRatio = addedChars / totalTokenChars;

                        if (addRatio > 0.5 || addedChars > significantUnchangedChars * 1.5 || (significantUnchangedChars === 0 && deletedChars === 0)) {
                            addedLines.add(posId);
                        } else {
                            modifiedLines.add(posId);
                        }
                    }
                }
            }

            // Move offset and recurse
            if (token.tokens || token.items) {
                const children = token.tokens || token.items;
                processTokens(children);
            } else {
                currentOffset += token.raw.length;
            }
        }
    };

    processTokens(tokens);
    return { addedLines, modifiedLines };
}
