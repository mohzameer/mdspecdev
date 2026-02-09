
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get('to');

    if (!to) {
        return NextResponse.json({ error: 'Missing "to" query parameter' }, { status: 400 });
    }

    try {
        console.log('Testing email to:', to);
        console.log('API Key Present:', !!process.env.RESEND_API_KEY);

        const result = await sendEmail({
            to,
            subject: 'Test Email from mdspec',
            html: '<p>This is a test email to verify Resend configuration.</p>',
            text: 'This is a test email to verify Resend configuration.',
        });

        console.log('Test email result:', result);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Test email failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
