import { ResetForm } from './reset-form';

export default function AdminResetPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-danger">Danger Zone</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">Reset Event</h1>
        <p className="mt-2 text-sm text-chalk-dim">
          Use this between live events to wipe everything and start clean. This cannot be undone.
        </p>
      </div>

      <div className="border border-danger/40 bg-danger/10 p-6">
        <p className="text-sm font-semibold text-chalk">This will immediately:</p>
        <ul className="mt-3 space-y-1.5 text-sm text-chalk-dim">
          <li>— Delete every club-owner account and force them out (they&apos;ll need to sign in and register again)</li>
          <li>— Rename all six clubs back to &quot;Club 1&quot;–&quot;Club 6&quot; and clear owner names</li>
          <li>— Reset every club&apos;s budget to ₹250M, wipe league record, finance history, and biggest win/loss</li>
          <li>— Un-sell every stadium, manager, and player from the auction</li>
          <li>— Reset every player&apos;s fitness, morale, cards, injuries, and season stats</li>
          <li>— Delete all lineups, match events, commentary, simulation logs, and transfers</li>
          <li>— Reset every fixture to unplayed and the season phase back to Registration</li>
        </ul>
        <p className="mt-3 text-sm text-chalk-dim">
          Your own admin session and the LLM provider settings in Settings are <span className="text-chalk">not</span>{' '}
          affected.
        </p>
      </div>

      <ResetForm />
    </div>
  );
}
