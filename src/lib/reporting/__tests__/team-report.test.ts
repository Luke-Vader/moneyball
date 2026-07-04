import { describe, expect, it } from 'vitest';
import { buildTeamInsights } from '../team-report';
import type { Club, Player } from '@/lib/supabase/database.types';

function club(overrides: Partial<Club> = {}): Club {
  return {
    id: 'club-1',
    name: 'Test FC',
    owner_name: 'Tester',
    budget: 100,
    cash: 100,
    loan: 0,
    formation: null,
    tactical_style: null,
    defensive_line: null,
    tempo: null,
    match_instructions: null,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
    biggest_win: null,
    biggest_loss: null,
    win_streak: 0,
    stadium_id: null,
    manager_id: null,
    captain_id: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function player(overrides: Partial<Player> & { id: string }): Player {
  return {
    name: 'Player',
    position: 'ST',
    real_club: 'Test FC',
    nationality: 'Testland',
    overall: 70,
    pace: 70,
    shooting: 70,
    passing: 70,
    dribbling: 70,
    defending: 70,
    physical: 70,
    base_price: 10,
    tier: 'Wonderkids / Bargains',
    owner_club_id: 'club-1',
    sold: true,
    fitness: 100,
    morale: 75,
    yellow_cards: 0,
    red_cards: 0,
    suspended: false,
    injured: false,
    injury_return_matchweek: null,
    chemistry_group: null,
    appearances: 0,
    minutes_played: 0,
    goals: 0,
    assists: 0,
    rating_sum: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('buildTeamInsights', () => {
  it('flags a low defending average relative to attack as a weakness/recommendation', () => {
    const squad = [
      player({ id: '1', shooting: 85, dribbling: 85, defending: 50 }),
      player({ id: '2', shooting: 82, dribbling: 80, defending: 55 }),
    ];
    const insights = buildTeamInsights(club(), squad);
    expect(insights.weaknesses.some((w) => w.includes('Defending'))).toBe(true);
    expect(insights.recommendations.some((r) => r.toLowerCase().includes('defen'))).toBe(true);
  });

  it('reports goals-per-game trend once matches have been played', () => {
    const insights = buildTeamInsights(club({ played: 4, gf: 8, ga: 4 }), [player({ id: '1' })]);
    expect(insights.trends.some((t) => t.includes('2.0 scored'))).toBe(true);
  });

  it('never returns empty strengths/weaknesses even for a perfectly average squad', () => {
    const squad = [player({ id: '1' }), player({ id: '2' })];
    const insights = buildTeamInsights(club(), squad);
    expect(insights.strengths.length).toBeGreaterThan(0);
    expect(insights.weaknesses.length).toBeGreaterThan(0);
  });

  it('gives a neutral recommendation when nothing stands out', () => {
    const squad = [player({ id: '1', fitness: 95, morale: 80 })];
    const insights = buildTeamInsights(club(), squad);
    expect(insights.recommendations).toContain('Squad is well balanced — no urgent tactical changes indicated.');
  });
});
