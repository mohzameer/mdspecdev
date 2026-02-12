import matter from 'gray-matter';
import type { SpecMetadata, Status, Maturity } from '@/lib/types';

/**
 * Valid values for spec metadata fields
 */
const VALID_STATUSES: Status[] = ['planned', 'in-progress', 'completed'];
const VALID_MATURITIES: Maturity[] = ['draft', 'review', 'stable', 'deprecated'];

/**
 * Parse markdown content with YAML frontmatter
 */
export function parseSpec(markdown: string): {
    metadata: SpecMetadata;
    content: string;
} {
    const { data, content } = matter(markdown);

    // Validate and sanitize metadata
    const metadata: SpecMetadata = {};

    // Progress: must be 0-10
    if (typeof data.progress === 'number') {
        metadata.progress = Math.max(0, Math.min(10, data.progress));
    }

    // Status: must be valid enum
    if (VALID_STATUSES.includes(data.status)) {
        metadata.status = data.status;
    }

    // Maturity: must be valid enum
    if (VALID_MATURITIES.includes(data.maturity)) {
        metadata.maturity = data.maturity;
    }

    // Owner: email string
    if (typeof data.owner === 'string') {
        metadata.owner = data.owner;
    }

    // Tags: array of strings
    if (Array.isArray(data.tags)) {
        metadata.tags = data.tags.filter((t) => typeof t === 'string');
    }

    // Target date: string
    if (typeof data.target_date === 'string') {
        metadata.target_date = data.target_date;
    }

    // Last reviewed: string
    if (typeof data.last_reviewed === 'string') {
        metadata.last_reviewed = data.last_reviewed;
    }

    // Reviewers: array of strings
    if (Array.isArray(data.reviewers)) {
        metadata.reviewers = data.reviewers.filter((r) => typeof r === 'string');
    }

    // Blockers: array of strings
    if (Array.isArray(data.blockers)) {
        metadata.blockers = data.blockers.filter((b) => typeof b === 'string');
    }

    // Dependencies: array of strings
    if (Array.isArray(data.depends_on)) {
        metadata.depends_on = data.depends_on.filter((d) => typeof d === 'string');
    }

    return {
        metadata,
        content: content.trim(),
    };
}

/**
 * Generate frontmatter YAML from metadata
 */
export function generateFrontmatter(metadata: SpecMetadata): string {
    const lines: string[] = ['---'];

    if (metadata.progress !== undefined) {
        lines.push(`progress: ${metadata.progress}`);
    }
    if (metadata.status) {
        lines.push(`status: ${metadata.status}`);
    }
    if (metadata.maturity) {
        lines.push(`maturity: ${metadata.maturity}`);
    }
    if (metadata.owner) {
        lines.push(`owner: ${metadata.owner}`);
    }
    if (metadata.tags && metadata.tags.length > 0) {
        lines.push(`tags: [${metadata.tags.join(', ')}]`);
    }
    if (metadata.target_date) {
        lines.push(`target_date: ${metadata.target_date}`);
    }
    if (metadata.last_reviewed) {
        lines.push(`last_reviewed: ${metadata.last_reviewed}`);
    }
    if (metadata.reviewers && metadata.reviewers.length > 0) {
        lines.push('reviewers:');
        metadata.reviewers.forEach((r) => lines.push(`  - ${r}`));
    }
    if (metadata.blockers && metadata.blockers.length > 0) {
        lines.push('blockers:');
        metadata.blockers.forEach((b) => lines.push(`  - "${b}"`));
    }
    if (metadata.depends_on && metadata.depends_on.length > 0) {
        lines.push('depends_on:');
        metadata.depends_on.forEach((d) => lines.push(`  - ${d}`));
    }

    lines.push('---');
    return lines.join('\n');
}

/**
 * Combine frontmatter and content into full markdown
 */
export function combineMarkdown(
    metadata: SpecMetadata,
    content: string
): string {
    const frontmatter = generateFrontmatter(metadata);
    return `${frontmatter}\n\n${content}`;
}
