'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Club } from '@/lib/supabase/database.types';

type SortKey = 'played' | 'won' | 'drawn' | 'lost' | 'gf' | 'ga' | 'gd' | 'points';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'played', label: 'P' },
  { key: 'won', label: 'W' },
  { key: 'drawn', label: 'D' },
  { key: 'lost', label: 'L' },
  { key: 'gf', label: 'GF' },
  { key: 'ga', label: 'GA' },
  { key: 'gd', label: 'GD' },
  { key: 'points', label: 'Pts' },
];

export function LeagueTable({ clubs }: { clubs: Club[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('points');
  const [desc, setDesc] = useState(true);

  const withGd = clubs.map((c) => ({ ...c, gd: c.gf - c.ga }));
  const sorted = [...withGd].sort((a, b) => (desc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));

  function toggleSort(key: SortKey) {
    if (key === sortKey) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(true);
    }
  }

  return (
    <div className="overflow-x-auto border border-gold/30">
      <table className="w-full stat-table text-sm">
        <thead className="bg-pitch-light text-xs uppercase tracking-wide text-chalk-dim">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Club</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="cursor-pointer px-3 py-2 hover:text-gold" onClick={() => toggleSort(c.key)}>
                {c.label}
                {sortKey === c.key ? (desc ? ' ▼' : ' ▲') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => (
            <tr key={c.id} className="border-t border-chalk-dim/10">
              <td className="px-3 py-2 text-chalk-dim">{i + 1}</td>
              <td className="px-3 py-2">
                <Link href={`/league/${c.id}`} className="text-chalk hover:text-gold">
                  {c.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-center text-chalk">{c.played}</td>
              <td className="px-3 py-2 text-center text-chalk">{c.won}</td>
              <td className="px-3 py-2 text-center text-chalk">{c.drawn}</td>
              <td className="px-3 py-2 text-center text-chalk">{c.lost}</td>
              <td className="px-3 py-2 text-center text-chalk">{c.gf}</td>
              <td className="px-3 py-2 text-center text-chalk">{c.ga}</td>
              <td className="px-3 py-2 text-center text-chalk">{c.gd}</td>
              <td className="px-3 py-2 text-center font-semibold text-gold">{c.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
