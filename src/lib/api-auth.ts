import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createJsClient, SupabaseClient, User } from '@supabase/supabase-js';
import { headers } from 'next/headers';

export async function getAuthenticatedClient(): Promise<{ user: User | null; supabase: SupabaseClient }> {
    // 1. Try to get user from cookies (via server client)
    const serverSupabase = await createServerClient();
    const { data: { user: cookieUser } } = await serverSupabase.auth.getUser();

    if (cookieUser) {
        return { user: cookieUser, supabase: serverSupabase };
    }

    // 2. Try to get user from Bearer token (API/CLI usage)
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization');

    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        // Create a client specifically for this token
        // Use the Anon key, but set the Authorization header
        const tokenSupabase = createJsClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            }
        );

        const { data: { user: tokenUser }, error } = await tokenSupabase.auth.getUser();

        if (!error && tokenUser) {
            return { user: tokenUser, supabase: tokenSupabase };
        }
    }

    // Return unauthenticated client (server client is safe default as it handles anon)
    return { user: null, supabase: serverSupabase };
}

// Keep the old helper for backward compatibility if needed, or update it
export async function getAuthenticatedUser(): Promise<User | null> {
    const { user } = await getAuthenticatedClient();
    return user;
}
