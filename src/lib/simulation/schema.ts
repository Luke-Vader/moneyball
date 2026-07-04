import { z } from 'zod';

// The strict JSON contract the LLM must return. "compute before narrate" is
// enforced by refEventIndex: every goal/card/injury commentary line must
// point at a real entry in events[] — validated server-side in validate.ts,
// independently of whatever the model claims.
export const llmEventSchema = z.object({
  minute: z.number().int().min(0).max(120),
  type: z.enum(['goal', 'card', 'injury', 'substitution']),
  side: z.enum(['home', 'away']),
  playerName: z.string().min(1),
  assistPlayerName: z.string().nullable().optional(),
  card: z.enum(['yellow', 'red']).nullable().optional(),
  detail: z.string().nullable().optional(),
});

export const llmCommentarySchema = z.object({
  minute: z.number().int().min(0).max(120),
  type: z.enum(['kickoff', 'filler', 'goal', 'card', 'injury', 'substitution', 'halftime', 'fulltime']),
  text: z.string().min(1),
  refEventIndex: z.number().int().min(0).nullable().optional(),
  side: z.enum(['home', 'away']).nullable().optional(),
});

export const llmPlayerRatingSchema = z.object({
  playerName: z.string().min(1),
  side: z.enum(['home', 'away']),
  rating: z.number().min(1).max(10),
});

export const llmStrengthBreakdownSchema = z.object({
  baseOverall: z.number(),
  homeAdvantage: z.number(),
  styleFit: z.number(),
  chemistry: z.number(),
  fitnessMorale: z.number(),
  notes: z.string().optional(),
});

export const llmMatchResultSchema = z.object({
  finalScore: z.object({ home: z.number().int().min(0), away: z.number().int().min(0) }),
  events: z.array(llmEventSchema),
  commentary: z.array(llmCommentarySchema).min(1),
  playerRatings: z.array(llmPlayerRatingSchema).optional().default([]),
  motmPlayerName: z.string().nullable().optional(),
  possession: z.object({ home: z.number(), away: z.number() }).nullable().optional(),
  shots: z.object({ home: z.number().int(), away: z.number().int() }).nullable().optional(),
  shotsOnTarget: z.object({ home: z.number().int(), away: z.number().int() }).nullable().optional(),
  corners: z.object({ home: z.number().int(), away: z.number().int() }).nullable().optional(),
  strengthBreakdown: z
    .object({ home: llmStrengthBreakdownSchema, away: llmStrengthBreakdownSchema })
    .nullable()
    .optional(),
});

export type LlmMatchResult = z.infer<typeof llmMatchResultSchema>;
export type LlmEvent = z.infer<typeof llmEventSchema>;
export type LlmCommentary = z.infer<typeof llmCommentarySchema>;
