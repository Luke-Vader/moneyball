import 'server-only';
import type { LlmProvider } from '@/lib/supabase/database.types';

export interface LlmCallParams {
  provider: LlmProvider;
  model: string;
  baseUrl: string | null;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
}

// Provider-agnostic by design: 'anthropic' speaks the Messages API,
// 'openai' and 'custom' both speak the OpenAI-compatible chat-completions
// shape (the organizer can point 'custom' at any compatible gateway).
export async function callLlm(params: LlmCallParams): Promise<string> {
  if (params.provider === 'anthropic') return callAnthropic(params);
  return callOpenAiCompatible(params);
}

async function callAnthropic({ model, baseUrl, apiKey, systemPrompt, userPrompt }: LlmCallParams): Promise<string> {
  const url = `${(baseUrl || 'https://api.anthropic.com').replace(/\/$/, '')}/v1/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (json.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
}

async function callOpenAiCompatible({
  provider,
  model,
  baseUrl,
  apiKey,
  systemPrompt,
  userPrompt,
}: LlmCallParams): Promise<string> {
  const url = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };
  // Only rely on strict JSON mode for the known-compatible OpenAI API —
  // arbitrary 'custom' endpoints may reject an unrecognized field.
  if (provider === 'openai') body.response_format = { type: 'json_object' };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LLM API error ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? '';
}
