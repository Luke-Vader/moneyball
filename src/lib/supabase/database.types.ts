// Hand-written to match supabase/migrations/*.sql exactly. If the schema
// changes, update this file in the same commit — there is no live project
// to run `supabase gen types` against yet.
//
// Every row shape below MUST be declared with `type X = {...}`, not
// `interface X {...}`. supabase-js's generic resolution checks each table's
// Row against `Record<string, unknown>` via `extends`, and TS interfaces
// (unlike type-literal aliases) don't structurally satisfy that check —
// every query silently resolves to `never` if you use `interface` here.

export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST';
export type Formation = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '3-4-3';
export type DefensiveLine = 'High' | 'Medium' | 'Low';
export type Tempo = 'Fast' | 'Balanced' | 'Slow';
export type ManagerStyle = 'Possession' | 'Gegenpress' | 'Park the Bus' | 'Counter-attack' | 'Wing Play';
export type StadiumCategory =
  | 'Commercial Powerhouse'
  | 'Fortress'
  | 'Elite Facilities'
  | 'Atmosphere'
  | 'Football Heritage';
export type PlayerTier =
  | 'Elite Goalkeepers'
  | 'Elite Defenders'
  | 'Elite Midfielders'
  | 'Elite Attackers'
  | 'Wonderkids / Bargains';
export type EventType = 'goal' | 'card' | 'injury' | 'substitution';
export type CommentaryType =
  | 'kickoff'
  | 'filler'
  | 'goal'
  | 'card'
  | 'injury'
  | 'substitution'
  | 'halftime'
  | 'fulltime';
export type Side = 'home' | 'away';
export type AuctionItemType = 'stadium' | 'manager' | 'player';
export type AuctionLotStatus = 'pending' | 'live' | 'sold' | 'unsold';
export type LlmProvider = 'openai' | 'anthropic' | 'custom';
export type SeasonPhase = 'registration' | 'auction' | 'squad_submission' | 'season' | 'completed';
export type Role = 'admin' | 'club_owner';

export type ScoreMargin = {
  opponent_club_id: string;
  for: number;
  against: number;
  margin: number;
  matchweek: number;
}

export type Club = {
  id: string;
  name: string;
  owner_name: string | null;
  budget: number;
  cash: number;
  loan: number;
  formation: Formation | null;
  tactical_style: string | null;
  defensive_line: DefensiveLine | null;
  tempo: Tempo | null;
  match_instructions: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  biggest_win: ScoreMargin | null;
  biggest_loss: ScoreMargin | null;
  win_streak: number;
  stadium_id: string | null;
  manager_id: string | null;
  captain_id: string | null;
  created_at: string;
  updated_at: string;
}

export type Stadium = {
  id: string;
  name: string;
  category: StadiumCategory;
  base_price: number;
  matchday_revenue: number;
  maintenance: number;
  home_advantage_stars: number;
  passive_ability: string;
  owner_club_id: string | null;
  sold: boolean;
  created_at: string;
}

export type Manager = {
  id: string;
  name: string;
  style: ManagerStyle;
  base_price: number;
  special_ability: string;
  owner_club_id: string | null;
  sold: boolean;
  created_at: string;
}

export type Player = {
  id: string;
  name: string;
  position: Position;
  real_club: string;
  nationality: string;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  base_price: number;
  tier: PlayerTier;
  owner_club_id: string | null;
  sold: boolean;
  fitness: number;
  morale: number;
  yellow_cards: number;
  red_cards: number;
  suspended: boolean;
  injured: boolean;
  injury_return_matchweek: number | null;
  chemistry_group: string | null;
  appearances: number;
  minutes_played: number;
  goals: number;
  assists: number;
  rating_sum: number;
  created_at: string;
  updated_at: string;
}

export type Fixture = {
  id: string;
  matchweek: number;
  home_club_id: string;
  away_club_id: string;
  played: boolean;
  home_goals: number | null;
  away_goals: number | null;
  stats_applied: boolean;
  motm_player_id: string | null;
  possession: { home: number; away: number } | null;
  shots: { home: number; away: number } | null;
  sot: { home: number; away: number } | null;
  corners: { home: number; away: number } | null;
  cards: { home: { yellow: number; red: number }; away: { yellow: number; red: number } } | null;
  lineup_lock_at: string | null;
  created_at: string;
}

export type Lineup = {
  id: string;
  club_id: string;
  fixture_id: string | null;
  starting_xi: string[];
  bench: string[];
  formation: Formation;
  style: string | null;
  defensive_line: DefensiveLine | null;
  tempo: Tempo | null;
  captain_id: string | null;
  instructions: string | null;
  locked: boolean;
  submitted_at: string;
  created_at: string;
}

export type MatchEvent = {
  id: string;
  fixture_id: string;
  minute: number;
  type: EventType;
  side: Side;
  player_id: string | null;
  assist_player_id: string | null;
  card_type: 'yellow' | 'red' | null;
  detail: string | null;
  created_at: string;
}

export type CommentaryLine = {
  id: string;
  fixture_id: string;
  minute: number;
  text: string;
  type: CommentaryType;
  ref_event_id: string | null;
  created_at: string;
}

export type FinanceLogRow = {
  id: string;
  matchweek: number;
  club_id: string;
  opening_cash: number;
  stadium_revenue: number;
  prize_money: number;
  maintenance: number;
  transfers_delta: number;
  other: number;
  closing_cash: number;
  created_at: string;
}

export type Award = {
  id: string;
  player_id: string;
  club_id: string | null;
  goals: number;
  assists: number;
  clean_sheets: number;
  avg_rating: number;
  season: string;
  created_at: string;
}

export type SeasonState = {
  id: true;
  phase: SeasonPhase;
  current_matchweek: number;
  updated_at: string;
}

export type Profile = {
  id: string;
  email: string;
  role: Role;
  club_id: string | null;
  created_at: string;
}

export type AuctionLot = {
  id: string;
  lot_order: number;
  item_type: AuctionItemType;
  item_id: string;
  status: AuctionLotStatus;
  winning_club_id: string | null;
  final_price: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export type AuctionBid = {
  id: string;
  lot_id: string;
  club_id: string;
  amount: number;
  created_at: string;
}

export type AuctionState = {
  id: true;
  current_lot_id: string | null;
  is_open: boolean;
  updated_at: string;
}

export type AppSettings = {
  id: true;
  llm_provider: LlmProvider | null;
  llm_model: string | null;
  llm_base_url: string | null;
  llm_api_key_secret_id: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type SimulationLog = {
  id: string;
  fixture_id: string;
  attempt: number;
  provider: string | null;
  model: string | null;
  request_payload: unknown;
  raw_response: string | null;
  validation_errors: unknown;
  success: boolean;
  created_at: string;
}

export type Transfer = {
  id: string;
  matchweek: 4 | 7;
  buyer_club_id: string;
  seller_club_id: string | null;
  player_id: string | null;
  amount: number;
  note: string | null;
  created_at: string;
}

export type PlayerMatchStat = {
  id: string;
  fixture_id: string;
  player_id: string;
  club_id: string;
  matchweek: number;
  started: boolean;
  minutes: number;
  rating: number | null;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  fitness_after: number | null;
  morale_after: number | null;
  injured: boolean;
  created_at: string;
};

// Shapes accepted by the commit_match_result() RPC — distinct from the
// MatchEvent/CommentaryLine row types because these are pre-insert payloads
// (event_index instead of a real ref_event_id, which only exists once the
// row is written inside that same function call).
export type MatchEventInsert = {
  minute: number;
  type: EventType;
  side: Side;
  player_id: string | null;
  assist_player_id: string | null;
  card_type: 'yellow' | 'red' | null;
  detail: string | null;
};

export type CommentaryInsert = {
  minute: number;
  type: CommentaryType;
  text: string;
  event_index: number | null;
};

export type PlayerUpdate = {
  player_id: string;
  appearances_delta: number;
  minutes_delta: number;
  goals_delta: number;
  assists_delta: number;
  yellow_delta: number;
  red_delta: number;
  fitness_delta: number;
  morale_delta: number;
  rating_delta: number;
  set_injured: boolean | null;
  set_suspended: boolean | null;
  injury_return_matchweek: number | null;
};

// Matches the exact shape @supabase/postgrest-js's GenericTable /
// GenericSchema expect (Row/Insert/Update/Relationships per table, plus
// Views/Enums/CompositeTypes) so the typed client resolves rows correctly
// instead of collapsing to `never`. Regenerate with `supabase gen types`
// once a live project exists instead of hand-maintaining this.
type Table<Row, Mutable = Row> = {
  Row: Row;
  Insert: Partial<Mutable>;
  Update: Partial<Mutable>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      clubs: Table<Club>;
      stadiums: Table<Stadium>;
      managers: Table<Manager>;
      players: Table<Player>;
      fixtures: Table<Fixture>;
      lineups: Table<Lineup>;
      match_events: Table<MatchEvent>;
      commentary_lines: Table<CommentaryLine>;
      finance_log: Table<FinanceLogRow>;
      awards: Table<Award>;
      season_state: Table<SeasonState>;
      profiles: Table<Profile>;
      auction_lots: Table<AuctionLot>;
      auction_bids: Table<AuctionBid>;
      auction_state: Table<AuctionState>;
      app_settings: Table<AppSettings>;
      simulation_logs: Table<SimulationLog>;
      transfers: Table<Transfer>;
      player_match_stats: Table<PlayerMatchStat>;
    };
    Views: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      current_club_id: { Args: Record<string, never>; Returns: string };
      register_club: { Args: { p_club_id: string; p_name: string; p_owner_name: string }; Returns: Club };
      assign_club_owner: { Args: { p_profile_id: string; p_club_id: string }; Returns: Profile };
      open_lot: { Args: { p_lot_id: string }; Returns: AuctionLot };
      mark_lot_unsold: { Args: { p_lot_id: string }; Returns: AuctionLot };
      place_bid: { Args: { p_lot_id: string; p_amount: number }; Returns: AuctionBid };
      confirm_sale: { Args: { p_lot_id: string }; Returns: AuctionLot };
      reset_event_data: { Args: Record<string, never>; Returns: void };
      submit_lineup: {
        Args: {
          p_club_id: string;
          p_fixture_id: string | null;
          p_starting_xi: string[];
          p_bench: string[];
          p_formation: Formation;
          p_style: string | null;
          p_defensive_line: DefensiveLine | null;
          p_tempo: Tempo | null;
          p_captain_id: string;
          p_instructions: string | null;
        };
        Returns: Lineup;
      };
      lock_lineup: { Args: { p_lineup_id: string }; Returns: Lineup };
      recompute_club_record: { Args: { p_fixture_id: string }; Returns: void };
      record_transfer: {
        Args: {
          p_matchweek: 4 | 7;
          p_buyer_club_id: string;
          p_seller_club_id: string | null;
          p_player_id: string | null;
          p_amount: number;
          p_note: string | null;
        };
        Returns: Transfer;
      };
      apply_finance_matchweek: { Args: { p_matchweek: number }; Returns: void };
      advance_matchweek: { Args: Record<string, never>; Returns: SeasonState };
      commit_match_result: {
        Args: {
          p_fixture_id: string;
          p_home_goals: number;
          p_away_goals: number;
          p_events: MatchEventInsert[];
          p_commentary: CommentaryInsert[];
          p_possession: { home: number; away: number } | null;
          p_shots: { home: number; away: number } | null;
          p_sot: { home: number; away: number } | null;
          p_corners: { home: number; away: number } | null;
          p_cards: { home: { yellow: number; red: number }; away: { yellow: number; red: number } } | null;
          p_motm_player_id: string | null;
          p_player_updates: PlayerUpdate[];
        };
        Returns: void;
      };
      set_llm_settings: {
        Args: { p_provider: LlmProvider; p_model: string; p_base_url: string | null; p_api_key: string | null };
        Returns: void;
      };
      get_llm_credentials: {
        Args: Record<string, never>;
        Returns: { llm_provider: LlmProvider | null; llm_model: string | null; llm_base_url: string | null; api_key: string | null }[];
      };
      get_llm_settings_public: {
        Args: Record<string, never>;
        Returns: { llm_provider: LlmProvider | null; llm_model: string | null; llm_base_url: string | null; has_api_key: boolean }[];
      };
    };
  };
}
