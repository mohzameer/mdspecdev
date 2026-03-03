import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDir = path.join(process.cwd(), 'src', 'content', 'blog');

export interface BlogPostMetadata {
    title: string;
    description: string;
    date: string;
    slug: string;
}

export interface BlogPost {
    metadata: BlogPostMetadata;
    content: string;
}

export function getBlogPosts(): BlogPostMetadata[] {
    if (!fs.existsSync(contentDir)) {
        return [];
    }

    const files = fs.readdirSync(contentDir);
    const markdownFiles = files.filter((file) => file.endsWith('.md'));

    const posts = markdownFiles.map((filename) => {
        const fileContent = fs.readFileSync(path.join(contentDir, filename), 'utf-8');
        const { data } = matter(fileContent);

        return {
            title: data.title || 'Untitled Post',
            description: data.description || '',
            date: data.date || '',
            slug: filename.replace('.md', ''),
        };
    });

    // Sort posts by date descending
    return posts.sort((a, b) => (new Date(a.date) < new Date(b.date) ? 1 : -1));
}

export function getBlogPost(slug: string): BlogPost | null {
    if (!fs.existsSync(contentDir)) {
        return null;
    }

    const fullPath = path.join(contentDir, `${slug}.md`);

    try {
        const fileContent = fs.readFileSync(fullPath, 'utf-8');
        const { data, content } = matter(fileContent);

        return {
            metadata: {
                title: data.title || 'Untitled Post',
                description: data.description || '',
                date: data.date || '',
                slug,
            },
            content,
        };
    } catch (error) {
        console.error(`Error reading blog post: ${slug}`, error);
        return null;
    }
}
