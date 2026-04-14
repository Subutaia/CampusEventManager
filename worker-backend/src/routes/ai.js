export async function handleAI(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/ai/generate-description' && request.method === 'POST') {
        return handleGenerateDescription(request, env);
    }

    return new Response("Not Found", { status: 404 });
}
async function handleGenerateDescription(request, env) {
    const { title = '', category = '', prompt = '' } = await request.json();

    const systemInstruction = `
You are helping organizers write campus event descriptions.
Write exactly 2 to 3 sentences.
Keep it clear, friendly, and professional.
Do not use bullet points.
Do not invent details that were not provided.
    `;

    const userPrompt = `
Event title: ${title}
Category: ${category}
Organizer notes: ${prompt}
    `;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents: [
                    {
                        parts: [{ text: userPrompt }]
                    }
                ]
            })
        }
    );

    const data = await res.json();

    const description =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(JSON.stringify({
        success: true,
        description
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}