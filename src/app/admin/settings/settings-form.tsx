'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { LlmProvider } from '@/lib/supabase/database.types';

interface InitialSettings {
  llm_provider: LlmProvider | null;
  llm_model: string | null;
  llm_base_url: string | null;
  has_api_key: boolean;
}

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: 'gpt-4.1',
  anthropic: 'claude-sonnet-5',
  custom: '',
};

export function SettingsForm({ initial }: { initial: InitialSettings }) {
  const router = useRouter();
  const [provider, setProvider] = useState<LlmProvider>(initial.llm_provider ?? 'anthropic');
  const [model, setModel] = useState(initial.llm_model ?? DEFAULT_MODELS[initial.llm_provider ?? 'anthropic']);
  const [baseUrl, setBaseUrl] = useState(initial.llm_base_url ?? '');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('set_llm_settings', {
      p_provider: provider,
      p_model: model,
      p_base_url: baseUrl || null,
      p_api_key: apiKey || null,
    });
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setApiKey('');
    setMessage({ type: 'success', text: 'Settings saved.' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gold/30 bg-pitch-light p-6">
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-chalk-dim">Provider</label>
        <select
          value={provider}
          onChange={(e) => {
            const p = e.target.value as LlmProvider;
            setProvider(p);
            if (!model) setModel(DEFAULT_MODELS[p]);
          }}
          className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="custom">Custom (OpenAI-compatible)</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-chalk-dim">Model</label>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g. claude-sonnet-5"
          required
          className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-chalk-dim">
          Base URL Override (optional)
        </label>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.your-provider.com/v1"
          className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-chalk-dim">
          API Key {initial.has_api_key && <span className="text-success">(currently set — leave blank to keep)</span>}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={initial.has_api_key ? '••••••••••••' : 'sk-…'}
          className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
        />
      </div>
      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-danger' : 'text-success'}`}>{message.text}</p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="bg-gold px-5 py-2 font-semibold uppercase tracking-wide text-pitch-dark hover:bg-gold-dim disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  );
}
