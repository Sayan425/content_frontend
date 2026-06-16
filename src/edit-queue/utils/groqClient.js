export const generateMotionGraphicCode = async (prompt, currentCode = '') => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("VITE_GROQ_API_KEY is not set in your environment.");
    }

    const systemMessage = `You are an expert React and Remotion animator. 
Your task is to write the raw JavaScript/JSX body of a React functional component to act as a Motion Graphic overlay in a video editor.
DO NOT wrap your code in \`function MyComponent() {}\` or \`export default\`. DO NOT include any \`import\` statements.
Write ONLY the function body that ends with a \`return <JSX... />\` statement.
Do NOT use markdown code blocks (\`\`\`jsx) in your response, just return the raw text.

You have access to the following variables:
- \`frame\`: The current frame of the video (from \`useCurrentFrame()\`)
- \`fps\`: The frames per second of the video (from \`useVideoConfig()\`)
- \`durationInFrames\`: The total duration of this overlay in frames.
- \`interpolate\`: The remotion interpolate function (e.g. \`interpolate(frame, [0, 15], [0, 1], {extrapolateRight: 'clamp'})\`)
- \`spring\`: The remotion spring function (e.g. \`spring({ fps, frame, config: { damping: 10 }})\`)
- \`React\`: The React object.

Your code will be evaluated dynamically inside this wrapper:
\`\`\`javascript
function DynamicGraphic(frame, fps, durationInFrames, interpolate, spring, React) {
  // YOUR CODE GOES HERE
}
\`\`\`

Ensure you return a single top-level JSX element, which is usually absolute positioned, or it can be a 100% width/height flex container. The parent container is already absolute positioned so you just need to style your elements. Make it look beautiful and premium. Use inline styles.`;

    const userMessage = currentCode 
        ? `Current code:\n\n${currentCode}\n\nUser request: ${prompt}\n\nPlease update the code based on the user request and return ONLY the new raw function body.`
        : `User request: ${prompt}\n\nPlease write the function body. Return ONLY raw code, no markdown blocks.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama3-70b-8192",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage }
            ],
            temperature: 0.3,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Failed to fetch from Groq API");
    }

    const data = await response.json();
    let code = data.choices[0].message.content.trim();
    
    // Clean up markdown blocks if the LLM disobeys
    if (code.startsWith('```')) {
        code = code.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    }
    
    return code;
};
