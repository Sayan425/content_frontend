import { supabase } from '../supabaseClient.js';

// fetch() wrapper for our /api/* endpoints: attaches the logged-in user's
// Supabase access token, which the server middleware requires.
export async function apiFetch(url, options = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = {
        ...(options.headers || {}),
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    };
    return fetch(url, { ...options, headers });
}
