
import { OrgMembersPage } from '@/components/org/OrgMembersPage';
import Link from 'next/link';

interface Props {
    params: Promise<{ orgSlug: string }>;
}

export default async function MembersPage({ params }: Props) {
    const { orgSlug } = await params;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <Link
                        href={`/${orgSlug}`}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm mb-4 inline-block"
                    >
                        ← Back to organization
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Organization Members
                    </h1>
                </div>

                <OrgMembersPage orgSlug={orgSlug} />
            </div>
        </div>
    );
}
