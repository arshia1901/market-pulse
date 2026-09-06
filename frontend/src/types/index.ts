export interface QuoteData {
  ltp: number;
  day_change: number;
  day_change_perc: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
  upper_circuit: number;
  lower_circuit: number;
  high_52w?: number;
  low_52w?: number;
  timestamp: number;
  is_stale?: boolean;
}

export interface WatchlistItem {
  id?: number;
  exchange: string;
  segment: string;
  trading_symbol: string;
  groww_symbol: string;
  name: string;
  display_order?: number;
}

export interface Watchlist {
  watchlist_id: string;
  watchlist_name: string;
  created_at: string;
  items: WatchlistItem[];
}

export interface DriftSignal {
  type: string;
  label: string;
  severity: "high" | "medium" | "low";
}

export interface DriftResult {
  symbol: string;
  exchange: string;
  name: string;
  score: number;
  badge: "hot" | "moving" | "calm";
  priceDelta: number;
  priceDeltaPerc: number;
  signals: DriftSignal[];
  lastSeenAt: number;
  currentQuote: QuoteData;
}

export interface DriftReport {
  data: DriftResult[];
  hasSnapshot: boolean;
  lastSeenAt?: number;
}

export interface Instrument {
  exchange: string;
  exchange_token: string;
  trading_symbol: string;
  groww_symbol: string;
  name: string;
  instrument_type: string;
  segment: string;
  series: string;
}
