
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Member {
    id: string;
    role: string;
    created_at: string;
    profile: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
    };
}

interface OrgMembersPageProps {
    orgSlug: string;
}

export function OrgMembersPage({ orgSlug }: OrgMembersPageProps) {
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');

    const [isInviting, setIsInviting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const router = useRouter();

    const fetchMembers = async () => {
        try {
            const res = await fetch(`/api/orgs/${orgSlug}/members`);
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            } else {
                setError('Failed to load members');
            }
        } catch (err) {
            setError('Failed to load members');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [orgSlug]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setIsInviting(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`/api/orgs/${orgSlug}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inviteEmail,
                    fullName: fullName || undefined,
                    password: password || undefined
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to add member');
            } else {
                setSuccess('Member added successfully');
                setInviteEmail('');
                setFullName('');
                setPassword('');
                fetchMembers(); // Refresh list
            }
        } catch (err) {
            setError('An error occurred');
            console.error(err);
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add Member</h2>
                <form onSubmit={handleInvite} className="flex flex-col gap-4 max-w-lg">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Full Name <span className="text-slate-400 font-normal">(optional, for new users)</span>
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Jane Doe"
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Password <span className="text-slate-400 font-normal">(optional, for new users)</span>
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Set a password for new account"
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            If the user does not exist, a new account will be created with this password.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isInviting}
                        className="self-start px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {isInviting ? 'Adding...' : 'Add Member'}
                    </button>
                </form>
                {error && (
                    <p className="mt-3 text-sm text-red-500">{error}</p>
                )}
                {success && (
                    <p className="mt-3 text-sm text-green-500">{success}</p>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Members ({members.length})
                    </h2>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading members...</div>
                ) : members.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No members found</div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {members.map((member) => (
                            <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold overflow-hidden">
                                        {member.profile.avatar_url ? (
                                            <img src={member.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            member.profile.full_name?.[0]?.toUpperCase() || member.profile.email[0].toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {member.profile.full_name || 'Unnamed User'}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {member.profile.email}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                        ${member.role === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                            member.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                                'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}`}>
                                        {member.role}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
