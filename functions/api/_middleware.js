// Auth gate for every /api/* function: requires a valid Supabase user token.
// The frontend sends the logged-in user's access token as a Bearer header;
// we verify it against Supabase Auth before letting any request through.
export async function onRequest(context) {
  const { request, env } = context;

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'Auth is not configured on the server' }, 500);
  }

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return json({ error: 'Unauthorized: missing access token' }, 401);
  }

  const verifyRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`
    }
  });

  if (!verifyRes.ok) {
    return json({ error: 'Unauthorized: invalid or expired session' }, 401);
  }

  const user = await verifyRes.json();
  if (!user || !user.id) {
    return json({ error: 'Unauthorized: invalid session' }, 401);
  }

  // Make the verified user available to the downstream function.
  context.data.user = user;
  return context.next();
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
