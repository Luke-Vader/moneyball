'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Club, CommentaryLine, Fixture, MatchEvent, Player } from '@/lib/supabase/database.types';

const AUTOPLAY_INTERVAL_MS = 1400;

export function MatchPlayback({
  fixture,
  homeClub,
  awayClub,
  events,
  commentary,
  players,
  motm,
}: {
  fixture: Fixture;
  homeClub: Club;
  awayClub: Club;
  events: MatchEvent[];
  commentary: CommentaryLine[];
  players: Player[];
  motm: Player | null;
}) {
  const [revealed, setRevealed] = useState(1);
  const [playing, setPlaying] = useState(false);

  const total = commentary.length;
  const fulltimeIndex = commentary.findIndex((c) => c.type === 'fulltime');
  const reachedFulltime = fulltimeIndex >= 0 && revealed >= fulltimeIndex + 1;

  const isPlaying = playing && revealed < total;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => setRevealed((r) => Math.min(total, r + 1)), AUTOPLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, revealed, total]);

  const playerName = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string | null) => (id ? map.get(id) ?? 'Unknown player' : null);
  }, [players]);

  const visibleLines = commentary.slice(0, revealed);
  const scorers = events.filter((e) => e.type === 'goal');
  const cards = events.filter((e) => e.type === 'card');

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="text-center">
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Matchweek {fixture.matchweek}</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">
          {homeClub.name} <span className="font-stats text-gold">{fixture.home_goals}</span>
          <span className="text-chalk-dim"> — </span>
          <span className="font-stats text-gold">{fixture.away_goals}</span> {awayClub.name}
        </h1>
      </div>

      <div className="flex items-center gap-3 border border-chalk-dim/30 bg-pitch-light p-3">
        <button
          onClick={() => setPlaying((p) => !p)}
          disabled={revealed >= total}
          className="border border-gold px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold hover:bg-gold hover:text-pitch-dark disabled:opacity-40"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={1}
          max={Math.max(1, total)}
          value={revealed}
          onChange={(e) => setRevealed(Number(e.target.value))}
          className="flex-1 accent-gold"
        />
        <button
          onClick={() => setRevealed(total)}
          className="border border-chalk-dim/40 px-3 py-1.5 text-xs uppercase tracking-wide text-chalk-dim hover:border-gold hover:text-gold"
        >
          Skip to Full Time
        </button>
      </div>

      <div className="space-y-2">
        {visibleLines.map((line) => {
          if (line.type === 'halftime') {
            return (
              <div key={line.id} className="border border-chalk-dim/40 bg-pitch-dark py-6 text-center">
                <p className="font-display text-2xl uppercase tracking-[0.3em] text-chalk-dim">Half Time</p>
              </div>
            );
          }
          if (line.type === 'fulltime') return null;
          const accent =
            line.type === 'goal'
              ? 'border-gold text-gold'
              : line.type === 'card' || line.type === 'injury'
                ? 'border-danger text-danger'
                : 'border-chalk-dim/20 text-chalk';
          return (
            <div key={line.id} className={`border-l-2 py-1.5 pl-3 ${accent}`}>
              <span className="font-stats text-xs text-chalk-dim">{line.minute}&apos;</span>{' '}
              <span className={line.type === 'filler' || line.type === 'kickoff' ? 'text-chalk' : ''}>
                {line.text}
              </span>
            </div>
          );
        })}
      </div>

      {reachedFulltime && (
        <section className="space-y-4 border border-gold bg-pitch-light p-6">
          <p className="text-xs uppercase tracking-wide text-gold">Full Time</p>
          <p className="font-display text-3xl text-chalk">
            {homeClub.name} {fixture.home_goals} — {fixture.away_goals} {awayClub.name}
          </p>
          <p className="text-chalk-dim">{commentary[fulltimeIndex]?.text}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-chalk-dim">Scorers</p>
              <ul className="mt-1 stat-table text-sm text-chalk">
                {scorers.length === 0 && <li className="text-chalk-dim">None</li>}
                {scorers.map((e) => (
                  <li key={e.id}>
                    {e.minute}&apos; {playerName(e.player_id)}
                    {e.assist_player_id && <span className="text-chalk-dim"> (assist: {playerName(e.assist_player_id)})</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-chalk-dim">Cards</p>
              <ul className="mt-1 stat-table text-sm text-chalk">
                {cards.length === 0 && <li className="text-chalk-dim">None</li>}
                {cards.map((e) => (
                  <li key={e.id} className={e.card_type === 'red' ? 'text-danger' : 'text-chalk'}>
                    {e.minute}&apos; {playerName(e.player_id)} ({e.card_type})
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {motm && (
            <p className="border-t border-chalk-dim/20 pt-3 text-sm text-chalk">
              <span className="text-gold">Player of the Match:</span> {motm.name}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 border-t border-chalk-dim/20 pt-3 stat-table text-sm sm:grid-cols-4">
            <Stat label="Possession" home={fixture.possession?.home} away={fixture.possession?.away} suffix="%" />
            <Stat label="Shots" home={fixture.shots?.home} away={fixture.shots?.away} />
            <Stat label="On Target" home={fixture.sot?.home} away={fixture.sot?.away} />
            <Stat label="Corners" home={fixture.corners?.home} away={fixture.corners?.away} />
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, home, away, suffix = '' }: { label: string; home?: number; away?: number; suffix?: string }) {
  if (home == null || away == null) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-chalk-dim">{label}</p>
      <p className="text-chalk">
        {home}
        {suffix} — {away}
        {suffix}
      </p>
    </div>
  );
}
