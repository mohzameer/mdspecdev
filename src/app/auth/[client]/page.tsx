import { Suspense } from 'react';
import { ClientLoginForm } from './ClientLoginForm';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ client: string }> }) {
    const { client } = await params;

    if (client !== 'vscode' && client !== 'cli') {
        return {
            title: 'Sign in to mdspec',
        };
    }

    const title = client === 'vscode' ? 'VSCode' : 'CLI';
    return {
        title: `Sign in to mdspec — ${title}`
    };
}

export default async function ClientAuthPage({ params }: { params: Promise<{ client: string }> }) {
    const { client } = await params;

    if (client !== 'vscode' && client !== 'cli') {
        notFound();
    }

    return (
        <Suspense fallback={<LoadingState />}>
            <ClientLoginForm clientType={client} />
        </Suspense>
    );
}

function LoadingState() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
