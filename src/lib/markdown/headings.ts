import type { HeadingInfo } from '@/lib/types';

/**
 * Generate a URL-safe heading ID from heading text
 */
export function generateHeadingId(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Extract all headings from markdown content
 */
export function extractHeadings(markdown: string): HeadingInfo[] {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: HeadingInfo[] = [];

    let match;
    while ((match = headingRegex.exec(markdown)) !== null) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = generateHeadingId(text);

        headings.push({ id, text, level });
    }

    return headings;
}

/**
 * Get the content of a specific section (from heading to next same-level heading)
 */
export function getSectionContent(
    markdown: string,
    headingText: string
): string {
    const lines = markdown.split(/\r?\n/);
    const headingId = generateHeadingId(headingText);

    let inSection = false;
    let sectionLevel = 0;
    const sectionLines: string[] = [];

    for (const line of lines) {
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = headingMatch[2].trim();
            const currentId = generateHeadingId(text);

            if (currentId === headingId) {
                inSection = true;
                sectionLevel = level;
                sectionLines.push(line);
                continue;
            }

            // End section when we hit a heading of same or higher level
            if (inSection && level <= sectionLevel) {
                break;
            }
        }

        if (inSection) {
            sectionLines.push(line);
        }
    }

    return sectionLines.join('\n').trim();
}

/**
 * Build a table of contents from headings
 */
export function buildTableOfContents(
    headings: HeadingInfo[]
): { toc: string; items: HeadingInfo[] } {
    const items = headings.filter((h) => h.level <= 3); // Only include h1-h3

    const tocLines = items.map((h) => {
        const indent = '  '.repeat(h.level - 1);
        return `${indent}- [${h.text}](#${h.id})`;
    });

    return {
        toc: tocLines.join('\n'),
        items,
    };
}
