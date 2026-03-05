import { diff_match_patch } from 'diff-match-patch';
import { marked } from 'marked';

/**
 * Normalizes text to a "match key" by converting to lowercase and 
 * stripping all non-alphanumeric characters. 
 * This bridges the gap between Markdown source and rendered HTML.
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
 * Uses character-level diffing mapped to block-level tokens (paragraphs, list items, headings).
 * Returns sets of "positional IDs" (key_index) to correctly handle duplicate text.
 */
export function computePositionalDiffs(oldContent: string, newContent: string): DiffResult {
    const dmp = new diff_match_patch();
    const oldText = oldContent.replace(/\r\n/g, '\n');
    const newText = newContent.replace(/\r\n/g, '\n');

    // 1. Precise character-level diff
    const diffs = dmp.diff_main(oldText, newText);
    dmp.diff_cleanupSemantic(diffs);

    const addedLines = new Set<string>();
    const modifiedLines = new Set<string>();

    // 2. Identify the blocks that will be rendered using marked lexer
    const tokens = marked.lexer(newText);
    const keyCounter = new Map<string, number>();

    let currentOffset = 0;

    const processTokens = (toks: any[]) => {
        for (const token of toks) {
            const tokenStart = currentOffset;
            const tokenEnd = currentOffset + token.raw.length;

            // Update offset for the next token in the stream
            currentOffset += token.raw.length;

            // We only highlight blocks that result in <p>, <li> or <hX> tags
            if (['paragraph', 'list_item', 'text', 'heading'].includes(token.type)) {
                const rawText = token.text || token.raw;
                const key = getMatchKey(rawText);
                if (!key) continue;

                // Generate positional ID to handle identical text segments
                const occurrence = (keyCounter.get(key) || 0);
                keyCounter.set(key, occurrence + 1);
                const posId = `${key}_${occurrence}`;

                // Check if any diff chunks within this token's range are additions or unchanged
                let charPos = 0;
                let addedChars = 0;
                let deletedChars = 0;
                let significantUnchangedChars = 0;
                const intersectedChunks: any[] = [];

                for (const [op, dText] of diffs) {
                    const chunkStart = charPos;
                    const chunkEnd = charPos + dText.length;
                    charPos += dText.length;

                    // Intersection check
                    if (chunkEnd > tokenStart && chunkStart < tokenEnd) {
                        const overlapStart = Math.max(chunkStart, tokenStart);
                        const overlapEnd = Math.min(chunkEnd, tokenEnd);
                        const overlapText = dText.substring(overlapStart - chunkStart, overlapEnd - chunkStart);

                        intersectedChunks.push({ op, text: overlapText });

                        if (op === 1) addedChars += overlapText.length;
                        else if (op === -1) deletedChars += overlapText.length;
                        else if (op === 0) {
                            if (overlapText.trim().length > 0) {
                                significantUnchangedChars += overlapText.length;
                            }
                        }
                    }
                }

                if (addedChars > 0) {
                    const totalTokenChars = rawText.length;
                    const addRatio = addedChars / totalTokenChars;

                    let type: 'ADDED' | 'MODIFIED' = 'ADDED';

                    // CLASSIFICATION LOGIC:
                    // 1. If it's mostly new (>50% of total length), it's probably an addition.
                    // 2. If the added content is significantly more than any "found" unchanged content, it's an addition.
                    // 3. Otherwise, if there's any addition, it's a modification.
                    if (addRatio > 0.5 || addedChars > significantUnchangedChars * 1.5 || (significantUnchangedChars === 0 && deletedChars === 0)) {
                        addedLines.add(posId);
                        type = 'ADDED';
                    } else {
                        modifiedLines.add(posId);
                        type = 'MODIFIED';
                    }

                    console.log(`[DiffUtils] ${type} (ratio: ${addRatio.toFixed(2)}): "${rawText.substring(0, 30)}..." | posId: ${posId} | add: ${addedChars}, del: ${deletedChars}, sym_unc: ${significantUnchangedChars}`);
                }
            } else if (token.tokens) {
                // Handle containers like lists, blockquotes
                const prevOffset = currentOffset - token.raw.length;
                currentOffset = prevOffset;
                processTokens(token.tokens);
                currentOffset = prevOffset + token.raw.length;
            }
        }
    };

    processTokens(tokens);

    return { addedLines, modifiedLines };
}
