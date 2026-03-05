import { diff_match_patch } from 'diff-match-patch';

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
 * Pure text-level diff utility using diff-match-patch.
 * Returns the raw diff chunks.
 */
export function computeTextDiffs(oldText: string, newText: string) {
    const dmp = new diff_match_patch();
    const normalizedOld = oldText.replace(/\r\n/g, '\n');
    const normalizedNew = newText.replace(/\r\n/g, '\n');

    const diffs = dmp.diff_main(normalizedOld, normalizedNew);
    dmp.diff_cleanupSemantic(diffs);
    return diffs;
}
