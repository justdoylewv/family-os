import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from './_lib/auth';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };
export const maxDuration = 60;

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['inFridge', 'alreadyHave', 'suggestions'],
  properties: {
    inFridge: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'amount'],
        properties: { name: { type: 'string' }, amount: { type: 'string', enum: ['plenty', 'some', 'low', 'almost out'] } },
      },
    },
    alreadyHave: { type: 'array', items: { type: 'string' } },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'reason'],
        properties: { name: { type: 'string' }, reason: { type: 'string' } },
      },
    },
  },
};

/**
 * POST { images: dataURL[], need: string[], pantry: string[] }
 * Claude looks at fridge photos and compares them with the "Need to Buy" list and
 * the things the family keeps in the pantry.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const user = await requireAuth(req, res);
  if (!user) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'The fridge scan needs ANTHROPIC_API_KEY set in Vercel.' });
    return;
  }

  const { images, need, pantry } = (req.body ?? {}) as { images?: unknown; need?: unknown; pantry?: unknown };
  const names = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).slice(0, 80)).slice(0, 200) : []);
  const needList = names(need);
  const pantryList = names(pantry);
  if (!Array.isArray(images) || images.length === 0) {
    res.status(400).json({ error: 'Take a photo first.' });
    return;
  }

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const img of images.slice(0, 3)) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(img));
    if (!m) {
      res.status(400).json({ error: 'That photo couldn’t be read. Try again.' });
      return;
    }
    content.push({ type: 'image', source: { type: 'base64', media_type: m[1] as MediaType, data: m[2] } });
  }
  content.push({
    type: 'text',
    text:
      'These photos show our family’s refrigerator (and maybe pantry shelves).\n\n' +
      `Our "need to buy" list: ${needList.join('; ') || '(empty)'}\n` +
      `Things we usually keep at home: ${pantryList.join('; ') || '(not known yet)'}\n\n` +
      'Fill in:\n' +
      '- inFridge: the food and drinks you can actually see, with a rough amount.\n' +
      '- alreadyHave: items from our need-to-buy list, copied word for word, that you can clearly see plenty of. Only include ones you are confident about.\n' +
      '- suggestions: things we probably need to buy: anything you can see is low or almost out, plus usual items you can’t see anywhere in the photos. Leave out anything already on the need-to-buy list. Use plain grocery names like "Milk" or "Shredded cheese" and a short reason like "almost empty" or "none in the fridge". At most 12.',
  });

  const client = new Anthropic({ apiKey });
  try {
    const msg = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content }],
    });
    if (msg.stop_reason === 'refusal') {
      res.status(422).json({ error: 'Claude couldn’t check that photo. Try another picture.' });
      return;
    }
    const block = msg.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text');
    if (!block) {
      res.status(502).json({ error: 'The fridge check came back empty. Try again.' });
      return;
    }
    const out = JSON.parse(block.text) as {
      inFridge: { name: string; amount: string }[];
      alreadyHave: string[];
      suggestions: { name: string; reason: string }[];
    };
    const onList = new Set(needList.map((x) => x.toLowerCase()));
    res.status(200).json({
      inFridge: out.inFridge ?? [],
      alreadyHave: (out.alreadyHave ?? []).filter((x) => onList.has(String(x).toLowerCase())),
      suggestions: (out.suggestions ?? []).filter((s) => !onList.has(String(s.name).toLowerCase())),
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      res.status(500).json({ error: 'The Claude API key isn’t valid. Check ANTHROPIC_API_KEY in Vercel.' });
    } else if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: 'Claude is busy right now. Try again in a minute.' });
    } else if (err instanceof Anthropic.APIError) {
      console.error('scan-fridge API error:', err.status, err.message);
      res.status(502).json({ error: `The fridge check failed (${err.status ?? 'network'}). Try again.` });
    } else {
      console.error('scan-fridge error:', err);
      res.status(500).json({ error: 'The fridge check failed. Try again.' });
    }
  }
}
