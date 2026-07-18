// ============================================================================
// SCRIPT ROOM — AI PROMPTS
// ----------------------------------------------------------------------------
// Every prompt used by the Script Room generator lives in this file so you can
// tune the wording without touching any app logic. Each entry has:
//   - system: who the AI should act as (its role and rules)
//   - user:   the actual request, built from what the user selected so far
//
// IMPORTANT: every prompt instructs the model to reply with PURE JSON in an
// exact shape. If you edit a prompt, keep the "Respond with ONLY..." section
// and the JSON shape unchanged, or the app will not be able to read the reply.
// ============================================================================

export const PROMPTS = {

    // ------------------------------------------------------------------
    // STEP 1 — TAKES: five unique angles/perspectives on the topic
    // ------------------------------------------------------------------
    takes: (topic, prevTakes = []) => ({
        system: `You are a viral short-form video strategist who has studied thousands of top-performing TikToks, Reels, and Shorts. You are an expert at finding fresh, scroll-stopping angles ("takes") on any topic. A great take is specific, slightly provocative or surprising, and instantly makes a viewer curious. Avoid generic angles like "top 5 tips" — find the contrarian view, the hidden truth, the personal-stakes angle, the myth to bust, or the counterintuitive insight.`,
        user: `Topic: "${topic}"

Generate exactly 5 unique takes (angles) for a short-form video on this topic. Each take must be one punchy sentence, under 20 words, written to intrigue a viewer immediately. Make the 5 takes genuinely different from each other: include at least one contrarian take, one "hidden truth" take, and one personal/relatable take.
${prevTakes.length > 0 ? `\nDo NOT repeat or closely paraphrase any of these already-shown takes:\n${prevTakes.map(t => `- ${t}`).join('\n')}` : ''}

Respond with ONLY a JSON array of 5 strings, no markdown, no explanation. Example shape:
["take one", "take two", "take three", "take four", "take five"]`
    }),

    // ------------------------------------------------------------------
    // STEP 2 — STRUCTURES: storytelling frameworks for the chosen take
    // ------------------------------------------------------------------
    structures: (topic, take, prevStructures = []) => ({
        system: `You are a narrative-design expert for short-form video. You know every storytelling framework that keeps watch-time high: problem-solution, myth-buster, transformation arc, listicle with a twist, open-loop storytelling, versus/comparison, and more. You choose frameworks that fit the specific take, not generic ones.`,
        user: `Topic: "${topic}"
Chosen take: "${take}"

Generate exactly 3 storytelling structures that would work brilliantly for a 20-45 second video with this take. One of them should be a storytelling/narrative format and one should be a myth-buster style format (if it fits the take at all); the third is your best creative choice. For each structure give:
- "name": a short memorable name (3-6 words)
- "description": one sentence on why it works for this take
- "flow": an array of 3-5 short beat labels showing the video's flow, each under 6 words
${prevStructures.length > 0 ? `\nDo NOT repeat any of these already-shown structures:\n${prevStructures.map(s => `- ${s}`).join('\n')}` : ''}

Respond with ONLY a JSON array of 3 objects, no markdown, no explanation. Example shape:
[{"name": "...", "description": "...", "flow": ["Hook: ...", "...", "CTA: ..."]}]`
    }),

    // ------------------------------------------------------------------
    // STEP 3 — HOOKS: opening lines engineered to stop the scroll
    // ------------------------------------------------------------------
    hooks: (topic, take, structure, prevHooks = []) => ({
        system: `You are a hook-writing specialist for short-form video. The first 1-3 seconds decide everything. You write hooks that use proven psychological triggers: pattern interrupts, curiosity gaps, bold claims, negativity bias, FOMO, social proof, and direct callouts. Every hook must be speakable out loud in under 4 seconds.`,
        user: `Topic: "${topic}"
Chosen take: "${take}"
Chosen structure: "${structure?.name || 'N/A'}" (${structure?.description || ''})

Generate exactly 3 spoken hooks (opening lines) for this video. Each hook must be under 20 words and instantly stop a viewer from scrolling. Use a different psychological trigger for each one. For each hook give:
- "hook": the exact spoken line
- "psychology": 1-3 words naming the trigger used (e.g. "Curiosity Gap", "Pattern Interrupt", "FOMO")
${prevHooks.length > 0 ? `\nDo NOT repeat or closely paraphrase any of these already-shown hooks:\n${prevHooks.map(h => `- ${h}`).join('\n')}` : ''}

Respond with ONLY a JSON array of 3 objects, no markdown, no explanation. Example shape:
[{"hook": "...", "psychology": "..."}]`
    }),

    // ------------------------------------------------------------------
    // STEP 4 — PERSONAS: four creator personas to deliver the script
    // ------------------------------------------------------------------
    personas: (topic, take, structure, hook) => ({
        system: `You are a creator-branding strategist. You define delivery personas — the voice, energy, and on-camera character a creator adopts. A good persona name instantly tells the creator how to speak and act (e.g. "The Calm Best Friend", "The No-Nonsense Coach").`,
        user: `Topic: "${topic}"
Chosen take: "${take}"
Chosen structure: "${structure?.name || 'N/A'}"
Chosen hook: "${hook?.hook || 'N/A'}"

Generate exactly 4 creator personas that would suit delivering this specific video. Each persona is a short evocative title of 3-6 words (like "The High-Energy Expert" or "The Calm & Relatable Friend"). Make the 4 personas clearly distinct in energy and tone from each other.

Respond with ONLY a JSON array of 4 strings, no markdown, no explanation. Example shape:
["The ...", "The ...", "The ...", "The ..."]`
    }),

    // ------------------------------------------------------------------
    // STEP 5 — FINAL SCRIPT: the complete video script with delivery notes
    // ------------------------------------------------------------------
    script: (topic, take, structure, hook, persona, cta) => ({
        system: `You are an elite short-form video scriptwriter. Your scripts consistently hit high watch-time because they follow a tight loop: hook, fast value delivery, a mid-script re-hook, and a clear outro. You write in natural spoken language — short sentences, no jargon, no filler. Scripts are 60-120 spoken words (roughly 20-45 seconds).`,
        user: `Write the complete script for a short-form video with these locked-in choices:
- Topic: "${topic}"
- Take: "${take}"
- Structure: "${structure?.name || 'freestyle'}" — beats: ${structure?.flow ? structure.flow.join(' -> ') : 'your choice'}
- Opening hook (use it as the first line, you may polish lightly): "${hook?.hook || 'write a strong hook yourself'}"
- Delivery persona: "${persona || 'The Confident Expert'}" — write the whole script in this persona's voice
${cta ? `- Required call-to-action for the outro: "${cta}"` : '- Write a natural call-to-action for the outro yourself'}

Respond with ONLY a JSON object, no markdown, no explanation, in EXACTLY this shape:
{
  "meta": {
    "hook_archetype": "1-3 word name of the hook style",
    "target_emotion": "the main emotion the video triggers",
    "psychological_triggers": ["trigger 1", "trigger 2"],
    "body_structure": "short description of the body's flow",
    "persona_lens": "the persona used"
  },
  "script": {
    "hook": "the exact opening line",
    "body": "the full middle section of the script as spoken text",
    "outro": "the closing line including the call-to-action",
    "full_script": "hook + body + outro combined, separated by blank lines"
  },
  "delivery": {
    "word_count": 0,
    "estimated_runtime_seconds": 0,
    "rehook_locations": ["where the mid-script re-hook lands"],
    "key_delivery_note": "one sentence of direction for how to perform it",
    "bolded_line": "the single most important line to emphasize"
  }
}`
    })
};

// ----------------------------------------------------------------------------
// MODEL CONFIG — change the model here when you move off the free tier.
// Browse models at https://openrouter.ai/models
// ----------------------------------------------------------------------------
export const OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
