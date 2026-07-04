import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from './settings-form';

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_llm_settings_public').single();

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Commissioner Console</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">Simulation Settings</h1>
        <p className="mt-2 text-sm text-chalk-dim">
          Match results are computed by an external LLM. Configure the provider once here — the API key is stored
          server-side in Supabase Vault and is never sent to any browser.
        </p>
      </div>
      <SettingsForm
        initial={
          error || !data
            ? { llm_provider: null, llm_model: null, llm_base_url: null, has_api_key: false }
            : data
        }
      />
    </div>
  );
}
