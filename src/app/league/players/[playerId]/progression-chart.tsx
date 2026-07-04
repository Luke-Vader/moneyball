'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface SeriesPoint {
  matchweek: number;
  rating: number | null;
  fitness: number | null;
  morale: number | null;
}

export function ProgressionChart({ series }: { series: SeriesPoint[] }) {
  return (
    <div className="border border-gold/30 bg-pitch-light p-4">
      <p className="mb-3 text-xs uppercase tracking-wide text-gold">Rating / Fitness / Morale by Matchweek</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid stroke="#3a4f42" strokeDasharray="3 3" />
            <XAxis dataKey="matchweek" stroke="#cfc9b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#cfc9b8" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#0e2a1c', border: '1px solid #d3a54a', color: '#f3efe3' }} />
            <Line type="monotone" dataKey="rating" stroke="#d3a54a" strokeWidth={2} dot={{ r: 3 }} name="Rating" />
            <Line type="monotone" dataKey="fitness" stroke="#4a8d5b" strokeWidth={1.5} dot={false} name="Fitness" />
            <Line type="monotone" dataKey="morale" stroke="#cfc9b8" strokeWidth={1.5} dot={false} name="Morale" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
