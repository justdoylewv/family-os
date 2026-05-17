import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { requireAuth } from './_lib/auth';

export const config = {
  api: {
    bodyParser: { sizeLimit: '15mb' },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    return;
  }

  const { audioData, mimeType } = (req.body ?? {}) as { audioData?: string; mimeType?: string };
  if (!audioData) {
    res.status(400).json({ error: 'Missing audio data' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const today = new Date().toISOString().split('T')[0];
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: audioData, mimeType: mimeType || 'audio/webm' } },
            {
              text:
                `Extract calendar events from this audio. Today is ${today}. ` +
                'Use YYYY-MM-DD for dates. Categorize each event as one of: ' +
                'family, kids, parents, medical, school, work, other.',
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              date: { type: Type.STRING, description: 'YYYY-MM-DD' },
              category: {
                type: Type.STRING,
                enum: ['family', 'kids', 'parents', 'medical', 'school', 'work', 'other'],
              },
            },
            required: ['title', 'date', 'category'],
          },
        },
      },
    });

    const events = response.text ? JSON.parse(response.text) : [];
    res.status(200).json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('parse-events error:', message);
    res.status(500).json({ error: message });
  }
}
