import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildMatchContext } from '@/lib/simulation/build-context';
import { buildUserPrompt, SIMULATION_SYSTEM_PROMPT } from '@/lib/simulation/prompt';
import { callLlm } from '@/lib/simulation/providers';
import { validateAndResolve } from '@/lib/simulation/validate';
import { computePlayerUpdates } from '@/lib/simulation/player-updates';

const MAX_ATTEMPTS = 2;

// A full-match generation (events + minute-by-minute commentary) routinely
// takes 20-60s per LLM call, and this route can make two (the one retry).
// Vercel's default function timeout (10s on Hobby) would kill this well
// before a real response arrives without raising it explicitly.
export const maxDuration = 300;

export async function POST(request: Request) {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await userClient.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Only the commissioner can run a simulation' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const fixtureId: string | undefined = body?.fixtureId;
  if (!fixtureId) return NextResponse.json({ error: 'fixtureId is required' }, { status: 400 });

  const admin = createAdminClient();

  const { data: fixture } = await admin.from('fixtures').select('*').eq('id', fixtureId).single();
  if (!fixture) return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
  if (fixture.played) return NextResponse.json({ error: 'Fixture has already been played' }, { status: 409 });

  const { data: credentials } = await admin.rpc('get_llm_credentials').single();
  if (!credentials?.llm_provider || !credentials.api_key || !credentials.llm_model) {
    return NextResponse.json(
      { error: 'Simulation failed — the commissioner has not configured an LLM provider/API key yet.' },
      { status: 400 }
    );
  }

  let context;
  try {
    context = await buildMatchContext(admin, fixtureId);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const systemPrompt = SIMULATION_SYSTEM_PROMPT;
  const userPrompt = buildUserPrompt(context);

  let lastErrors: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let rawResponse = '';
    let callFailed: string | null = null;

    try {
      rawResponse = await callLlm({
        provider: credentials.llm_provider,
        model: credentials.llm_model,
        baseUrl: credentials.llm_base_url,
        apiKey: credentials.api_key,
        systemPrompt,
        userPrompt,
      });
    } catch (err) {
      callFailed = (err as Error).message;
    }

    const validation = callFailed ? null : validateAndResolve(rawResponse, context);
    const success = Boolean(validation?.ok);

    await admin.from('simulation_logs').insert({
      fixture_id: fixtureId,
      attempt,
      provider: credentials.llm_provider,
      model: credentials.llm_model,
      request_payload: { systemPrompt, userPrompt },
      raw_response: callFailed ?? rawResponse,
      validation_errors: callFailed ? [callFailed] : validation && !validation.ok ? validation.errors : null,
      success,
    });

    if (validation?.ok) {
      const playerUpdates = computePlayerUpdates(context, validation.data, fixture.matchweek);
      const { error: commitError } = await admin.rpc('commit_match_result', {
        p_fixture_id: fixtureId,
        p_home_goals: validation.data.finalScore.home,
        p_away_goals: validation.data.finalScore.away,
        p_events: validation.data.events,
        p_commentary: validation.data.commentary,
        p_possession: validation.data.possession,
        p_shots: validation.data.shots,
        p_sot: validation.data.sot,
        p_corners: validation.data.corners,
        p_cards: null,
        p_motm_player_id: validation.data.motmPlayerId,
        p_player_updates: playerUpdates,
      });

      if (commitError) {
        return NextResponse.json({ error: `Simulation validated but failed to save: ${commitError.message}` }, { status: 500 });
      }

      return NextResponse.json({
        finalScore: validation.data.finalScore,
        motmPlayerId: validation.data.motmPlayerId,
        attempt,
      });
    }

    lastErrors = callFailed ? [callFailed] : (validation && !validation.ok ? validation.errors : ['Unknown validation failure']);
  }

  return NextResponse.json(
    {
      error: 'Simulation failed — check API key / provider status, then try again.',
      details: lastErrors,
    },
    { status: 502 }
  );
}
