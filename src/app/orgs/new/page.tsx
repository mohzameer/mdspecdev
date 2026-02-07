'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewOrgPage() {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // First ensure profile exists
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setError('You must be logged in');
            setLoading(false);
            return;
        }

        // Check if profile exists, create if not
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (!profile) {
            const { error: profileError } = await supabase.from('profiles').insert({
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || user.email,
            });

            if (profileError) {
                setError(`Failed to create profile: ${profileError.message}`);
                setLoading(false);
                return;
            }
        }

        // Create organization
        const { data: org, error: createError } = await supabase
            .from('organizations')
            .insert({ name })
            .select()
            .single();

        if (createError) {
            setError(createError.message);
            setLoading(false);
            return;
        }

        // Create owner membership manually (since trigger may not work)
        await supabase.from('org_memberships').insert({
            org_id: org.id,
            user_id: user.id,
            role: 'owner',
        });

        router.push(`/orgs/${org.id}`);
        router.refresh();
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8 max-w-lg">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Create Organization
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                    Organizations contain projects and team members.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                        >
                            Organization name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Acme Inc."
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 py-3 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white font-medium rounded-lg transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
