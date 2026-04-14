import { Hono } from 'hono';

const ai = new Hono();

ai.post('/generate-description', async (c) => {
    try {
        const { title = '', category = '', prompt = '' } = await c.req.json();

        if (!prompt.trim()) {
            return c.json({
                success: false,
                error: 'Prompt is required.'
            }, 400);
        }

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `
Write a clean, professional campus event description in 2-3 sentences.
Do not use bullet points.
Do not invent details that were not provided.

Event title: ${title || 'Untitled Event'}
Category: ${category || 'general'}
Organizer notes: ${prompt}
                                    `.trim()
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await res.json();

        const description =
            data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        if (!description) {
            return c.json({
                success: false,
                error: 'No description returned from Gemini.',
                raw: data
            }, 500);
        }

        return c.json({
            success: true,
            description
        });
    } catch (error) {
        console.error('AI route error:', error);
        return c.json({
            success: false,
            error: 'AI generation failed'
        }, 500);
    }
});

export default ai;