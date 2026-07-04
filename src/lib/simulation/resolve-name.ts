import type { PlayerContext } from './build-context';

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '') // strip accents left over from NFD (Dembélé, Vinícius, etc.)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Exact match first, then accent/punctuation-insensitive match, then a
// last-name-only match IF exactly one roster player shares that last name.
// Returns null (never a guess) when nothing unambiguous is found — the
// caller must treat that as a hard validation failure, not a fallback.
export function resolvePlayerName(name: string, roster: PlayerContext[]): PlayerContext | null {
  const exact = roster.find((p) => p.name === name);
  if (exact) return exact;

  const normalized = normalize(name);
  const normalizedMatch = roster.find((p) => normalize(p.name) === normalized);
  if (normalizedMatch) return normalizedMatch;

  const lastNameCandidates = roster.filter((p) => {
    const parts = normalize(p.name).split(' ');
    return parts[parts.length - 1] === normalized.split(' ').pop();
  });
  if (lastNameCandidates.length === 1) return lastNameCandidates[0];

  return null;
}
