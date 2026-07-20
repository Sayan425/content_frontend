export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const apiKey = env.GROQ_API_KEY || env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key is not configured" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.text();
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(err, { status: response.status, headers: { 'Content-Type': 'application/json' }});
    }

    const data = await response.text();
    return new Response(data, { headers: { 'Content-Type': 'application/json' }});
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
