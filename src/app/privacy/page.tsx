export default function PrivacyPolicyPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-8 text-center">
                Privacy Policy
            </h1>
            <div className="prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p>At MDSpec, your privacy is a priority. This document outlines the types of information we collect and how we use it to provide our specification management platform.</p>

                <h2>1. Information We Collect</h2>
                <p>We collect information you provide directly to us when creating an account, such as your name, email address, and profile details. We also securely store the specification documents, comments, and project metadata you create on the platform.</p>

                <h2>2. How We Use Your Information</h2>
                <p>We use your information exclusively to provide, maintain, and improve the MDSpec service. This includes authenticating your access, routing your specifications correctly, and managing organization-level permissions.</p>

                <h2>3. Information Sharing</h2>
                <p>We do not sell your personal information. We may share information with trusted third-party service providers (such as hosting and database providers like Supabase) strictly to facilitate our services. We ensure they adhere to strict confidentiality standards.</p>

                <h2>4. Data Security</h2>
                <p>Your specifications are protected by Row Level Security (RLS) policies within our database. Only authorized members of your projects and organizations can access your private data.</p>

                <h2>5. Your Rights</h2>
                <p>You have the right to access, update, or delete your account and associated data at any time. If you wish to permanently delete your data, please contact us.</p>

                <h2>6. Jurisdiction</h2>
                <p>This Privacy Policy and any matters relating to our collection and use of your data shall be governed by the laws of Sri Lanka, and shall be resolved exclusively in the courts of Sri Lanka.</p>

                <p className="mt-8 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
}
