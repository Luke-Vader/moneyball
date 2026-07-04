'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { DefensiveLine, Formation, Lineup, ManagerStyle, Player, Tempo } from '@/lib/supabase/database.types';
import { FORMATIONS, FORMATION_REQUIREMENTS, bucketForPosition, type PositionBucket } from '@/lib/lineup/formations';

const STYLES: ManagerStyle[] = ['Possession', 'Gegenpress', 'Park the Bus', 'Counter-attack', 'Wing Play'];
const DEFENSIVE_LINES: DefensiveLine[] = ['High', 'Medium', 'Low'];
const TEMPOS: Tempo[] = ['Fast', 'Balanced', 'Slow'];

type Selection = Record<string, 'start' | 'bench' | undefined>;

export function LineupForm({
  clubId,
  fixtureId,
  squad,
  existingLineup,
}: {
  clubId: string;
  fixtureId: string | null;
  squad: Player[];
  existingLineup: Lineup | null;
}) {
  const router = useRouter();
  const [formation, setFormation] = useState<Formation>(existingLineup?.formation ?? '4-3-3');
  const [style, setStyle] = useState<string>(existingLineup?.style ?? STYLES[0]);
  const [defensiveLine, setDefensiveLine] = useState<DefensiveLine>(existingLineup?.defensive_line ?? 'Medium');
  const [tempo, setTempo] = useState<Tempo>(existingLineup?.tempo ?? 'Balanced');
  const [instructions, setInstructions] = useState(existingLineup?.instructions ?? '');
  const [captainId, setCaptainId] = useState<string | null>(existingLineup?.captain_id ?? null);
  const [selection, setSelection] = useState<Selection>(() => {
    const initial: Selection = {};
    existingLineup?.starting_xi.forEach((id) => (initial[id] = 'start'));
    existingLineup?.bench.forEach((id) => (initial[id] = 'bench'));
    return initial;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const starters = useMemo(() => squad.filter((p) => selection[p.id] === 'start'), [squad, selection]);
  const bench = useMemo(() => squad.filter((p) => selection[p.id] === 'bench'), [squad, selection]);

  const counts = useMemo(() => {
    const c: Record<PositionBucket, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    starters.forEach((p) => c[bucketForPosition(p.position)]++);
    return c;
  }, [starters]);

  const requirement = FORMATION_REQUIREMENTS[formation];
  const requirementsMet =
    starters.length === 11 && counts.GK === 1 && counts.DEF === requirement.def &&
    counts.MID === requirement.mid && counts.FWD === requirement.fwd;

  function toggle(playerId: string, role: 'start' | 'bench') {
    setSelection((prev) => {
      const current = prev[playerId];
      const next = { ...prev };
      if (current === role) {
        delete next[playerId];
        if (role === 'start' && captainId === playerId) setCaptainId(null);
      } else {
        if (role === 'start' && starters.length >= 11 && current !== 'start') return prev;
        if (role === 'bench' && bench.length >= 5 && current !== 'bench') return prev;
        next[playerId] = role;
        if (role === 'bench' && captainId === playerId) setCaptainId(null);
      }
      return next;
    });
  }

  async function handleSubmit() {
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('submit_lineup', {
      p_club_id: clubId,
      p_fixture_id: fixtureId,
      p_starting_xi: starters.map((p) => p.id),
      p_bench: bench.map((p) => p.id),
      p_formation: formation,
      p_style: style,
      p_defensive_line: defensiveLine,
      p_tempo: tempo,
      p_captain_id: captainId as string,
      p_instructions: instructions || null,
    });
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: 'Lineup saved.' });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-4">
        <Field label="Formation">
          <select
            value={formation}
            onChange={(e) => setFormation(e.target.value as Formation)}
            className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
          >
            {FORMATIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tactical Style">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
          >
            {STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Defensive Line">
          <select
            value={defensiveLine}
            onChange={(e) => setDefensiveLine(e.target.value as DefensiveLine)}
            className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
          >
            {DEFENSIVE_LINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tempo">
          <select
            value={tempo}
            onChange={(e) => setTempo(e.target.value as Tempo)}
            className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
          >
            {TEMPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="flex flex-wrap gap-4 border border-gold/30 bg-pitch-light p-4 stat-table text-sm">
        <CountBadge label="Starting XI" value={starters.length} target={11} />
        <CountBadge label="Bench" value={bench.length} target={5} exact={false} />
        <CountBadge label="GK" value={counts.GK} target={1} />
        <CountBadge label="DEF" value={counts.DEF} target={requirement.def} />
        <CountBadge label="MID" value={counts.MID} target={requirement.mid} />
        <CountBadge label="FWD" value={counts.FWD} target={requirement.fwd} />
      </section>

      <section className="overflow-x-auto border border-chalk-dim/20">
        <table className="w-full stat-table text-sm">
          <thead className="bg-pitch-light text-left text-xs uppercase tracking-wide text-chalk-dim">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2">OVR</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Selection</th>
            </tr>
          </thead>
          <tbody>
            {squad.map((p) => {
              const unavailable = p.injured || p.suspended;
              return (
                <tr key={p.id} className="border-t border-chalk-dim/10">
                  <td className="px-3 py-2 text-chalk">{p.name}</td>
                  <td className="px-3 py-2 text-chalk-dim">{p.position}</td>
                  <td className="px-3 py-2 text-chalk">{p.overall}</td>
                  <td className="px-3 py-2">
                    {p.injured && <span className="text-danger">Injured</span>}
                    {p.suspended && <span className="text-danger">Suspended</span>}
                    {!unavailable && <span className="text-success">Available</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={unavailable}
                        onClick={() => toggle(p.id, 'start')}
                        className={`border px-2 py-1 text-xs uppercase disabled:opacity-30 ${
                          selection[p.id] === 'start'
                            ? 'border-gold bg-gold text-pitch-dark'
                            : 'border-chalk-dim/40 text-chalk-dim hover:border-gold'
                        }`}
                      >
                        Start
                      </button>
                      <button
                        type="button"
                        disabled={unavailable}
                        onClick={() => toggle(p.id, 'bench')}
                        className={`border px-2 py-1 text-xs uppercase disabled:opacity-30 ${
                          selection[p.id] === 'bench'
                            ? 'border-chalk bg-chalk text-pitch-dark'
                            : 'border-chalk-dim/40 text-chalk-dim hover:border-chalk'
                        }`}
                      >
                        Bench
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Captain">
          <select
            value={captainId ?? ''}
            onChange={(e) => setCaptainId(e.target.value || null)}
            className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
          >
            <option value="">Select captain…</option>
            {starters.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Match Instructions (optional)">
          <input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Protect lead after 70'"
            className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
          />
        </Field>
      </section>

      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-danger' : 'text-success'}`}>{message.text}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={busy || !requirementsMet || !captainId}
        className="bg-gold px-6 py-3 font-semibold uppercase tracking-wide text-pitch-dark hover:bg-gold-dim disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save Lineup'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wide text-chalk-dim">{label}</label>
      {children}
    </div>
  );
}

function CountBadge({
  label,
  value,
  target,
  exact = true,
}: {
  label: string;
  value: number;
  target: number;
  exact?: boolean;
}) {
  const ok = exact ? value === target : value <= target;
  return (
    <span className={ok ? 'text-success' : 'text-chalk'}>
      {label}: {value}/{target}
    </span>
  );
}
