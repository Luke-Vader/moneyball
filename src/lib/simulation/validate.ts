import { llmMatchResultSchema, type LlmCommentary, type LlmEvent } from './schema';
import { resolvePlayerName } from './resolve-name';
import type { MatchContext, PlayerContext, SideContext } from './build-context';
import type { CommentaryInsert, MatchEventInsert } from '@/lib/supabase/database.types';

export interface ValidatedSimulation {
  finalScore: { home: number; away: number };
  events: MatchEventInsert[];
  commentary: CommentaryInsert[];
  playerRatings: { playerId: string; side: 'home' | 'away'; rating: number }[];
  motmPlayerId: string | null;
  possession: { home: number; away: number } | null;
  shots: { home: number; away: number } | null;
  sot: { home: number; away: number } | null;
  corners: { home: number; away: number } | null;
  strengthBreakdown: unknown;
}

export type ValidationResult = { ok: true; data: ValidatedSimulation } | { ok: false; errors: string[] };

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function rosterFor(context: MatchContext, side: 'home' | 'away'): PlayerContext[] {
  const sideCtx: SideContext = side === 'home' ? context.home : context.away;
  return [...sideCtx.startingXI, ...sideCtx.bench];
}

export function validateAndResolve(raw: string, context: MatchContext): ValidationResult {
  const errors: string[] = [];

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripCodeFences(raw));
  } catch {
    return { ok: false, errors: ['Response was not valid JSON.'] };
  }

  const parsed = llmMatchResultSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  const result = parsed.data;

  // Resolve every event's player (and assist) name to a real roster id,
  // strictly within the side the event claims to belong to.
  const resolvedEvents: (MatchEventInsert | null)[] = result.events.map((event: LlmEvent, index: number) => {
    const roster = rosterFor(context, event.side);
    const player = resolvePlayerName(event.playerName, roster);
    if (!player) {
      errors.push(`events[${index}]: unknown player "${event.playerName}" on ${event.side} side`);
      return null;
    }
    let assistPlayerId: string | null = null;
    if (event.assistPlayerName) {
      const assist = resolvePlayerName(event.assistPlayerName, roster);
      if (!assist) {
        errors.push(`events[${index}]: unknown assist player "${event.assistPlayerName}" on ${event.side} side`);
        return null;
      }
      assistPlayerId = assist.id;
    }
    return {
      minute: event.minute,
      type: event.type,
      side: event.side,
      player_id: player.id,
      assist_player_id: assistPlayerId,
      card_type: event.card ?? null,
      detail: event.detail ?? null,
    };
  });

  if (errors.length > 0) return { ok: false, errors };
  const events = resolvedEvents as MatchEventInsert[];

  // Compute-before-narrate: every goal/card/injury commentary line must
  // point at a real event with the same minute/type/side.
  const commentary: CommentaryInsert[] = [];
  result.commentary.forEach((line: LlmCommentary, index: number) => {
    if (line.type === 'goal' || line.type === 'card' || line.type === 'injury') {
      if (line.refEventIndex == null || line.side == null) {
        errors.push(`commentary[${index}]: type "${line.type}" is missing refEventIndex/side`);
        return;
      }
      const event = events[line.refEventIndex];
      if (!event) {
        errors.push(`commentary[${index}]: refEventIndex ${line.refEventIndex} does not exist in events[]`);
        return;
      }
      if (event.type !== line.type || event.side !== line.side || event.minute !== line.minute) {
        errors.push(
          `commentary[${index}]: does not match events[${line.refEventIndex}] (minute/type/side mismatch)`
        );
        return;
      }
    }
    commentary.push({
      minute: line.minute,
      type: line.type,
      text: line.text,
      event_index: line.refEventIndex ?? null,
    });
  });

  if (errors.length > 0) return { ok: false, errors };

  if (!commentary.some((c) => c.type === 'halftime')) errors.push('commentary is missing a "halftime" line');
  if (!commentary.some((c) => c.type === 'fulltime')) errors.push('commentary is missing a "fulltime" line');
  if (errors.length > 0) return { ok: false, errors };

  const playerRatings: ValidatedSimulation['playerRatings'] = [];
  for (const [index, rating] of result.playerRatings.entries()) {
    const player = resolvePlayerName(rating.playerName, rosterFor(context, rating.side));
    if (!player) {
      errors.push(`playerRatings[${index}]: unknown player "${rating.playerName}" on ${rating.side} side`);
      continue;
    }
    playerRatings.push({ playerId: player.id, side: rating.side, rating: rating.rating });
  }
  if (errors.length > 0) return { ok: false, errors };

  let motmPlayerId: string | null = null;
  if (result.motmPlayerName) {
    const both = [...rosterFor(context, 'home'), ...rosterFor(context, 'away')];
    const motm = resolvePlayerName(result.motmPlayerName, both);
    if (!motm) {
      return { ok: false, errors: [`motmPlayerName "${result.motmPlayerName}" does not match any player`] };
    }
    motmPlayerId = motm.id;
  }

  return {
    ok: true,
    data: {
      finalScore: result.finalScore,
      events,
      commentary,
      playerRatings,
      motmPlayerId,
      possession: result.possession ?? null,
      shots: result.shots ?? null,
      sot: result.shotsOnTarget ?? null,
      corners: result.corners ?? null,
      strengthBreakdown: result.strengthBreakdown ?? null,
    },
  };
}
