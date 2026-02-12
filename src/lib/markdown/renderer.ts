import { marked } from 'marked';

/**
 * Custom renderer that adds IDs to headings for anchor linking
 */
const renderer = new marked.Renderer();

renderer.heading = function ({ text, depth }: { text: string; depth: number }) {
    const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `<h${depth} id="${id}" class="heading-anchor">${text}</h${depth}>\n`;
};

// Configure marked options
marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
});

/**
 * Render markdown to HTML (sanitization done client-side)
 * This is used for server-side rendering where we trust the content
 */
export function renderMarkdown(content: string): string {
    return marked(content) as string;
}
