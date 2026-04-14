import { Hono } from 'hono';

const ai = new Hono();

ai.post('/generate-description', async (c) => {
    try {
        const { title = '', category = '', prompt = '' } = await c.req.json();

        // 🔑 HERE is where your key is used
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

Event title: ${title}
Category: ${category}
Organizer notes: ${prompt}
                                    `
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

        return c.json({
            success: true,
            description
        });

    } catch (error) {
        console.error("AI error:", error);
        return c.json({
            success: false,
            error: "AI generation failed"
        }, 500);
    }
});

export default ai;