import type { PlayerUpdate } from '@/lib/supabase/database.types';
import type { MatchContext, PlayerContext, SideContext } from './build-context';
import type { ValidatedSimulation } from './validate';

const FITNESS_DRAIN_STARTER = -10;
const FITNESS_RECOVERY_UNUSED = 3;
const MORALE_WIN = 3;
const MORALE_LOSS = -3;
const DEFAULT_RATING = 6.0;
const YELLOW_SUSPENSION_MULTIPLE = 3;

// Pure and DB-free by design (see src/lib/simulation/__tests__) — appearance
// credit and minutes are only given to starters, since the LLM event schema
// (per spec) doesn't identify which substitute replaced whom. Everyone else
// on the matchday squad gets a small fitness recovery bump instead.
export function computePlayerUpdates(
  context: MatchContext,
  result: ValidatedSimulation,
  currentMatchweek: number
): PlayerUpdate[] {
  const updates = new Map<string, PlayerUpdate>();

  function ensure(playerId: string): PlayerUpdate {
    let u = updates.get(playerId);
    if (!u) {
      u = {
        player_id: playerId,
        appearances_delta: 0,
        minutes_delta: 0,
        goals_delta: 0,
        assists_delta: 0,
        yellow_delta: 0,
        red_delta: 0,
        fitness_delta: 0,
        morale_delta: 0,
        rating_delta: 0,
        set_injured: null,
        set_suspended: null,
        injury_return_matchweek: null,
      };
      updates.set(playerId, u);
    }
    return u;
  }

  function sideOutcome(side: SideContext): 'win' | 'draw' | 'loss' {
    const own = side.isHome ? result.finalScore.home : result.finalScore.away;
    const opp = side.isHome ? result.finalScore.away : result.finalScore.home;
    if (own > opp) return 'win';
    if (own < opp) return 'loss';
    return 'draw';
  }

  for (const side of [context.home, context.away]) {
    const outcome = sideOutcome(side);
    const moraleDelta = outcome === 'win' ? MORALE_WIN : outcome === 'loss' ? MORALE_LOSS : 0;

    for (const player of side.startingXI) {
      const u = ensure(player.id);
      u.appearances_delta = 1;
      u.minutes_delta = 90;
      u.fitness_delta = FITNESS_DRAIN_STARTER;
      u.morale_delta = moraleDelta;
    }
    for (const player of side.bench) {
      const u = ensure(player.id);
      u.fitness_delta = FITNESS_RECOVERY_UNUSED;
    }
  }

  const ratingByPlayer = new Map(result.playerRatings.map((r) => [r.playerId, r.rating]));
  for (const side of [context.home, context.away]) {
    for (const player of side.startingXI) {
      const u = ensure(player.id);
      u.rating_delta = ratingByPlayer.get(player.id) ?? fallbackRating(player, result, side);
    }
  }

  for (const event of result.events) {
    if (event.type === 'goal' && event.player_id) {
      ensure(event.player_id).goals_delta += 1;
      if (event.assist_player_id) ensure(event.assist_player_id).assists_delta += 1;
    }
    if (event.type === 'card' && event.player_id) {
      const u = ensure(event.player_id);
      if (event.card_type === 'red') {
        u.red_delta += 1;
        u.set_suspended = true;
      } else if (event.card_type === 'yellow') {
        u.yellow_delta += 1;
        const priorTotal = findPlayer(context, event.player_id)?.yellowCards ?? 0;
        const newTotal = priorTotal + u.yellow_delta;
        if (newTotal % YELLOW_SUSPENSION_MULTIPLE === 0) u.set_suspended = true;
      }
    }
    if (event.type === 'injury' && event.player_id) {
      const u = ensure(event.player_id);
      u.set_injured = true;
      u.injury_return_matchweek = Math.min(10, currentMatchweek + 1);
    }
  }

  return Array.from(updates.values());
}

function findPlayer(context: MatchContext, playerId: string): PlayerContext | undefined {
  return [...context.home.startingXI, ...context.home.bench, ...context.away.startingXI, ...context.away.bench].find(
    (p) => p.id === playerId
  );
}

function fallbackRating(player: PlayerContext, result: ValidatedSimulation, side: SideContext): number {
  let rating = DEFAULT_RATING;
  const goals = result.events.filter((e) => e.type === 'goal' && e.player_id === player.id).length;
  const assists = result.events.filter((e) => e.type === 'goal' && e.assist_player_id === player.id).length;
  const yellows = result.events.filter(
    (e) => e.type === 'card' && e.card_type === 'yellow' && e.player_id === player.id
  ).length;
  const reds = result.events.filter((e) => e.type === 'card' && e.card_type === 'red' && e.player_id === player.id).length;
  rating += goals * 0.7 + assists * 0.4 - yellows * 0.3 - reds * 2;
  const own = side.isHome ? result.finalScore.home : result.finalScore.away;
  const opp = side.isHome ? result.finalScore.away : result.finalScore.home;
  rating += own > opp ? 0.3 : own < opp ? -0.3 : 0;
  return Math.max(1, Math.min(10, Number(rating.toFixed(1))));
}
