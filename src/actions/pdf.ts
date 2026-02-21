'use server';

import { createClient } from '@/lib/supabase/server';

export async function generatePdf(specId: string) {
    const supabase = await createClient();

    // 1. Fetch spec and latest revision content
    const { data: spec, error: specError } = await supabase
        .from('specs')
        .select(`
            name,
            project_id,
            revisions (
                content_key,
                revision_number
            )
        `)
        .eq('id', specId)
        .single();

    if (specError || !spec) {
        throw new Error('Spec not found');
    }

    interface Revision {
        content_key: string;
        revision_number: number;
    }
    const revisions = spec.revisions as unknown as Revision[];

    const latestRevision = revisions?.sort(
        (a, b) => b.revision_number - a.revision_number
    )[0];

    if (!latestRevision?.content_key) {
        throw new Error('No content found for this spec');
    }

    // 2. Download markdown content
    const { data: fileData, error: fileError } = await supabase.storage
        .from('spec-content')
        .download(latestRevision.content_key);

    if (fileError || !fileData) {
        throw new Error('Failed to download spec content');
    }

    const markdownContent = await fileData.text();
    // Use robust frontmatter stripping handling various newlines and spacing (handles stacked frontmatters)
    const frontmatterRegex = /^\s*---\r?\n[\s\S]*?\r?\n---\r?\n+/;
    let contentWithoutFrontmatter = markdownContent;
    while (frontmatterRegex.test(contentWithoutFrontmatter)) {
        contentWithoutFrontmatter = contentWithoutFrontmatter.replace(frontmatterRegex, '').trimStart();
    }

    // 3. Call PodPDF API
    const apiKey = process.env.PODPDF_API_KEY;
    if (!apiKey) {
        throw new Error('PODPDF_API_KEY is not configured');
    }

    // Prepare PodPDF payload
    // Verified via documentation: Use /quickjob endpoint and specific type field
    const payload = {
        markdown: contentWithoutFrontmatter,
        input_type: 'markdown',
        options: {
            "landscape": false,
            "format": "A4",
            "print_background": true
        }
    };

    // Debug logging
    console.log('Generating PDF for spec:', specId);
    console.log('API Key configured:', !!apiKey);
    console.log('Payload size:', JSON.stringify(payload).length);
    console.log('Payload content preview:', payload.markdown.substring(0, 100) + '...');

    try {
        const response = await fetch('https://api.podpdf.com/quickjob', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify(payload),
        });

        console.log('PodPDF Response Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('PodPDF API Error:', response.status, errorText);
            throw new Error(`PodPDF generation failed: ${response.statusText}`);
        }

        // The API returns the PDF binary directly
        const pdfBuffer = await response.arrayBuffer();

        // Return base64 encoded string to client
        return Buffer.from(pdfBuffer).toString('base64');

    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
}
