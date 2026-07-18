// Thin OpenRouter chat-completions client used by the Script Room generator.
// Reads the key from VITE_OPENROUTER_API_KEY, retries on 429 rate limits, and
// parses the model's JSON reply (stripping ```json fences if the model adds
// them despite instructions).

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

// Pull a JSON value out of the model's text reply. Models sometimes wrap JSON
// in markdown fences or add a sentence around it, so fall back to slicing out
// the outermost {...} or [...] block before giving up.
function parseModelJson(text) {
    const cleaned = String(text).replace(/```json/gi, '```').replace(/```/g, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch (_) {
        const firstBrace = Math.min(...['{', '['].map(ch => {
            const idx = cleaned.indexOf(ch);
            return idx === -1 ? Infinity : idx;
        }));
        const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
        if (firstBrace !== Infinity && lastBrace > firstBrace) {
            return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        }
        throw new Error('The AI reply was not valid JSON. Please try regenerating.');
    }
}

/**
 * Send one prompt to OpenRouter and get back parsed JSON.
 * @param {{system: string, user: string}} prompt - from script-room-prompts.js
 * @param {string} model - OpenRouter model id
 */
export async function callOpenRouterJson(prompt, model) {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_OPENROUTER_API_KEY is not set in your environment.');
    }

    const response = await fetchWithRetry(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: prompt.system },
                { role: 'user', content: prompt.user },
            ],
            temperature: 0.9,
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
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('OpenRouter returned an empty reply. Please try again.');
    }
    return parseModelJson(content);
}
