import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const MAX_CHARS = 300;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const text = (body?.text || "").trim();

    if (!text) return Response.json({ error: 'Empty text' }, { status: 400 });
    if (text.length > MAX_CHARS) {
      return Response.json({ error: `Text too long (max ${MAX_CHARS} characters)` }, { status: 400 });
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Translate the following phrase into natural, colloquial English suitable for a spoken conversation. Reply with ONLY the translation, no explanations or quotes: ${text}`,
    });

    const translation = (typeof result === 'string' ? result : result?.output || result?.text || JSON.stringify(result)).trim();

    return Response.json({ translation });
  } catch (error) {
    return Response.json({ error: error.message || 'Translation failed' }, { status: 500 });
  }
}