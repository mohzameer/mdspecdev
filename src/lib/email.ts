import { Resend } from 'resend';

// Initialize Resend with API key
// If key is missing, operations will fail gracefully or mock in dev
const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailProps {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailProps) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not set. Email not sent.');
        console.log('--- EMAIL MOCK ---');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('--- END MOCK ---');
        return { success: true, id: 'mock-id' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'MDSpec <noreply@mdspec.dev>',
            to,
            subject,
            html,
            text,
        });

        if (error) {
            console.error('Resend returned error:', error);
            return { success: false, error };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error('Failed to send email (exception):', error);
        return { success: false, error };
    }
}
