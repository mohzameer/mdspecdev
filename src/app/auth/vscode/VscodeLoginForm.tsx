'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function VscodeLoginForm() {
    const searchParams = useSearchParams();
    const port = searchParams.get('port');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    // Guard: port must be in the IANA ephemeral range (49152–65535).
    // This prevents the page from being pointed at common developer services
    // (e.g. 3000, 8080, 5432) by a malicious link.
    const portNumber = port ? parseInt(port, 10) : NaN;
    const isValidPort = !isNaN(portNumber) && portNumber >= 49152 && portNumber <= 65535;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!isValidPort) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Authenticate with mdspec API
            const loginRes = await fetch('/api/public/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const loginData = await loginRes.json();
            if (!loginRes.ok) {
                throw new Error(loginData.error || 'Login failed. Please check your credentials.');
            }

            // 2. Send token to the extension's local callback server
            //    The extension listens on 127.0.0.1:<port>/callback
            const callbackRes = await fetch(`http://127.0.0.1:${portNumber}/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: loginData.session.access_token,
                    refreshToken: loginData.session.refresh_token,
                    email: loginData.user.email,
                }),
            });

            if (!callbackRes.ok) {
                throw new Error('Could not connect to VSCode. Make sure the extension is running and try again.');
            }

            setDone(true);

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    // ── Invalid / missing port ──────────────────────────────────────────────
    if (!isValidPort) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300 p-6">
                <div className="w-full max-w-md text-center space-y-4">
                    <div className="text-5xl">⚠️</div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Invalid link</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        This page must be opened from the <strong>mdspec VSCode extension</strong>.
                        <br />Run the <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm">mdspec: Sign In</code> command in VSCode.
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-600">
                        (Port must be in the ephemeral range 49152–65535)
                    </p>
                </div>
            </div>
        );
    }

    // ── Success state ───────────────────────────────────────────────────────
    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300 p-6">
                <div className="w-full max-w-md text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">You&apos;re connected!</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Return to VSCode — you&apos;re now signed in to mdspec.
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-600">
                        You can close this browser tab.
                    </p>
                </div>
            </div>
        );
    }

    // ── Login form ──────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300 p-6">
            <div className="w-full max-w-md space-y-8">

                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 mb-6">
                        {/* VSCode icon */}
                        <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 19.86V4.14a1.5 1.5 0 0 0-.85-1.553zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
                        </svg>
                        <span className="text-slate-400 dark:text-slate-500">×</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">mdspec</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Connect to VSCode
                    </h1>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">
                        Sign in to link your mdspec account with the extension
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Error banner */}
                        {error && (
                            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="you@example.com"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Connecting…
                                </span>
                            ) : (
                                'Sign in to VSCode'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer note */}
                <p className="text-center text-xs text-slate-400 dark:text-slate-600">
                    Your credentials are sent securely to mdspec and never stored by the extension.
                </p>
            </div>
        </div>
    );
}
