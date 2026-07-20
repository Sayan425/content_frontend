// Thin OpenRouter chat-completions client used by the Script Room generator.
//
// We use OpenRouter's *structured outputs* (response_format: json_schema with
// strict: true). The model is forced to return JSON that exactly matches the
// schema we send, so there is no fragile text-parsing here — the reply is
// guaranteed-valid JSON and we just JSON.parse it. `require_parameters: true`
// makes OpenRouter only route to providers that actually support this, so we
// fail loudly rather than silently getting free-form text back.

const OPENROUTER_URL = '/api/openrouter';

async function fetchWithRetry(url, options, maxRetries = 4) {
    for (let i = 0; i < maxRetries; i++) {
        const response = await fetch(url, options);
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : (Math.pow(2, i) * 1000 + Math.random() * 1000);
            console.warn(`OpenRouter rate limited (429). Retrying in ${Math.round(delayMs)}ms... (${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
        }
        return response;
    }
    return fetch(url, options);
}

/**
 * Send one prompt to OpenRouter with a strict JSON schema and get back the
 * parsed object (already matching the schema).
 * @param {{system: string, user: string, schemaName: string, schema: object}} prompt
 * @param {string} model - OpenRouter model id
 */
export async function callOpenRouterStructured(prompt, model) {
    const response = await fetchWithRetry(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            // Only route to providers that actually honour response_format.
            provider: { require_parameters: true },
            messages: [
                { role: 'system', content: prompt.system },
                { role: 'user', content: prompt.user },
            ],
            temperature: 0.9,
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: prompt.schemaName,
                    strict: true,
                    schema: prompt.schema,
                },
            },
        }),
    });

    if (!response.ok) {
        let detail = '';
        try {
            const errBody = await response.json();
            detail = errBody?.error?.message || JSON.stringify(errBody);
        } catch (_) { /* non-JSON error body */ }
        throw new Error(`OpenRouter request failed (${response.status}): ${detail || response.statusText}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    const content = message?.content || message?.reasoning;
    if (!content) {
        throw new Error('OpenRouter returned an empty reply. Please try again.');
    }

    // With strict structured outputs the content is guaranteed-valid JSON that
    // matches our schema — a plain parse is all that's needed.
    return JSON.parse(content);
}
