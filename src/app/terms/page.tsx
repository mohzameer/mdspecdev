export default function TermsOfServicePage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-8 text-center">
                Terms of Service
            </h1>
            <div className="prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p>Welcome to MDSpec. By accessing our platform, you agree to these terms.</p>

                <h2>1. Acceptance of Terms</h2>
                <p>By creating an account and using MDSpec, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>

                <h2>2. User Content & Specifications</h2>
                <p>You retain full ownership of the specifications and content you store on MDSpec. However, you are solely responsible for ensuring you have the necessary rights to use and share that content.</p>

                <h2>3. Usage Limits</h2>
                <p>MDSpec tracks specifications in parallel to Git. While we provide storage for revision tracking and organizational metadata, you agree not to use the service to store excessive amounts of non-specification data or to abuse the API.</p>

                <h2>4. Termination</h2>
                <p>We reserve the right to suspend or terminate accounts that violate these terms or abuse the platform's resources without prior notice.</p>

                <h2>5. Disclaimer of Warranties</h2>
                <p>MDSpec is provided "as is" without warranty of any kind. We do not guarantee that the service will be uninterrupted or error-free.</p>

                <h2>6. Governing Law & Jurisdiction</h2>
                <p>These terms and any disputes arising out of or related to your use of MDSpec shall be governed by and construed in accordance with the laws of Sri Lanka, and shall be resolved exclusively in the courts of Sri Lanka.</p>

                <p className="mt-8 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
}
