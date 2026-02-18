import { Suspense } from 'react';
import { VscodeLoginForm } from './VscodeLoginForm';

export const metadata = {
    title: 'Sign in to mdspec — VSCode',
};

export default function VscodeAuthPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <VscodeLoginForm />
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
