import db from "./db";
import { QuoteData, Snapshot } from "../types";

export function saveSnapshot(
  sessionId: string, exchange: string, tradingSymbol: string, quote: QuoteData
): void {
  db.saveSnapshot({
    session_id: sessionId, exchange, trading_symbol: tradingSymbol,
    ltp: quote.ltp, volume: quote.volume, day_change_perc: quote.day_change_perc,
    high_52w: quote.high_52w || 0, low_52w: quote.low_52w || 0,
    upper_circuit: quote.upper_circuit || 0, lower_circuit: quote.lower_circuit || 0,
    timestamp: quote.timestamp || Date.now(),
  });
}

export function getSnapshot(sessionId: string, exchange: string, tradingSymbol: string): Snapshot | null {
  const row = db.getSnapshot(sessionId, exchange, tradingSymbol);
  if (!row) return null;
  return {
    ltp: row.ltp, volume: row.volume, day_change_perc: row.day_change_perc,
    high_52w: row.high_52w, low_52w: row.low_52w,
    upper_circuit: row.upper_circuit, lower_circuit: row.lower_circuit,
    timestamp: row.timestamp,
  };
}

export function getAllSnapshots(sessionId: string): Array<Snapshot & { exchange: string; trading_symbol: string }> {
  return db.getAllSnapshots(sessionId).map(r => ({
    exchange: r.exchange, trading_symbol: r.trading_symbol,
    ltp: r.ltp, volume: r.volume, day_change_perc: r.day_change_perc,
    high_52w: r.high_52w, low_52w: r.low_52w,
    upper_circuit: r.upper_circuit, lower_circuit: r.lower_circuit,
    timestamp: r.timestamp,
  }));
}

export function saveMultipleSnapshots(
  sessionId: string,
  snapshots: Array<{ exchange: string; trading_symbol: string; quote: QuoteData }>
): void {
  for (const item of snapshots) {
    saveSnapshot(sessionId, item.exchange, item.trading_symbol, item.quote);
  }
}
