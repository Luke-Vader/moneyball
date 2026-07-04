import type { Club, Player } from '@/lib/supabase/database.types';

export interface TeamInsights {
  strengths: string[];
  weaknesses: string[];
  trends: string[];
  recommendations: string[];
}

const ATTRIBUTE_LABELS: [keyof Player, string][] = [
  ['pace', 'Pace'],
  ['shooting', 'Shooting'],
  ['passing', 'Passing'],
  ['dribbling', 'Dribbling'],
  ['defending', 'Defending'],
  ['physical', 'Physical'],
];

function average(squad: Player[], key: keyof Player): number {
  const nums = squad.map((p) => p[key]).filter((v): v is number => typeof v === 'number');
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Pure and rule-based (no LLM call): this report needs to be cheap and
// available instantly for all six clubs at once, unlike match simulation
// which is a deliberate, one-per-fixture LLM call.
export function buildTeamInsights(club: Club, squad: Player[]): TeamInsights {
  const attrAverages = ATTRIBUTE_LABELS.map(([key, label]) => ({ label, value: average(squad, key) }));
  const sorted = [...attrAverages].sort((a, b) => b.value - a.value);

  const strengths = sorted
    .filter((a) => a.value >= 72)
    .slice(0, 2)
    .map((a) => `${a.label} (squad average ${a.value.toFixed(1)})`);
  const weaknesses = sorted
    .filter((a) => a.value < 65)
    .slice(-2)
    .map((a) => `${a.label} (squad average ${a.value.toFixed(1)})`);

  if (strengths.length === 0 && sorted.length > 0) {
    strengths.push(`${sorted[0].label} (squad average ${sorted[0].value.toFixed(1)}, best of the group)`);
  }
  if (weaknesses.length === 0 && sorted.length > 0) {
    const lowest = sorted[sorted.length - 1];
    weaknesses.push(`${lowest.label} (squad average ${lowest.value.toFixed(1)}, weakest of the group)`);
  }

  const trends: string[] = [];
  if (club.played > 0) {
    trends.push(`Averaging ${(club.gf / club.played).toFixed(1)} scored and ${(club.ga / club.played).toFixed(1)} conceded per game.`);
  }
  if (club.win_streak >= 2) trends.push(`Currently on a ${club.win_streak}-match win streak.`);

  const avgFitness = average(squad, 'fitness');
  const avgMorale = average(squad, 'morale');
  const defAvg = average(squad, 'defending');
  const atkAvg = (average(squad, 'shooting') + average(squad, 'dribbling')) / 2;

  const recommendations: string[] = [];
  if (avgFitness < 80) {
    recommendations.push(`Squad fitness is averaging ${avgFitness.toFixed(0)}% — consider rotation or a slower tempo next fixture.`);
  }
  if (avgMorale < 60) {
    recommendations.push(`Morale is low (${avgMorale.toFixed(0)}%) — a settled lineup and low-risk tactics may help steady the group.`);
  }
  if (defAvg < atkAvg - 8) {
    recommendations.push('Defence lags attack — a lower defensive line or a Park the Bus-style setup could tighten things up.');
  } else if (atkAvg < defAvg - 8) {
    recommendations.push('Attack lags defence — consider a higher tempo or Wing Play to create more chances.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Squad is well balanced — no urgent tactical changes indicated.');
  }

  return { strengths, weaknesses, trends, recommendations };
}
