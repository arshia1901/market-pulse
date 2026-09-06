import axios from "axios";
import { parse } from "csv-parse/sync";
import { Instrument } from "../types";

const INSTRUMENT_CSV_URL = "https://growwapi-assets.groww.in/instruments/instrument.csv";
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let instruments: Instrument[] = [];
let lastFetchedAt = 0;
let isLoading = false;

// Popular default symbols for demo
const POPULAR_SYMBOLS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
  "HINDUNILVR", "ITC", "SBIN", "BAJFINANCE", "KOTAKBANK",
  "NIFTY", "BANKNIFTY", "SENSEX", "WIPRO", "AXISBANK",
  "LT", "ASIANPAINT", "MARUTI", "SUNPHARMA", "TITAN"
];

async function fetchInstruments(): Promise<void> {
  if (isLoading) return;
  isLoading = true;
  try {
    console.log("[InstrumentCache] Fetching CSV...");
    const resp = await axios.get(INSTRUMENT_CSV_URL, {
      responseType: "text",
      timeout: 30000,
    });
    const records = parse(resp.data, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as any[];

    instruments = records.map((r) => ({
      exchange: r.exchange || "",
      exchange_token: r.exchange_token || "",
      trading_symbol: r.trading_symbol || "",
      groww_symbol: r.groww_symbol || "",
      name: r.name || r.trading_symbol || "",
      instrument_type: r.instrument_type || "EQ",
      segment: r.segment || "CASH",
      series: r.series || "EQ",
      isin: r.isin || "",
      underlying_symbol: r.underlying_symbol || "",
      expiry_date: r.expiry_date || "",
      strike_price: r.strike_price || "",
      lot_size: r.lot_size || "1",
      tick_size: r.tick_size || "0.05",
    }));

    lastFetchedAt = Date.now();
    console.log(`[InstrumentCache] Loaded ${instruments.length} instruments`);
  } catch (err) {
    console.error("[InstrumentCache] Failed to fetch CSV:", err.message);
    // Load mock instruments for demo
    instruments = generateMockInstruments();
    lastFetchedAt = Date.now();
  } finally {
    isLoading = false;
  }
}

function generateMockInstruments(): Instrument[] {
  const equities = [
    { symbol: "RELIANCE", name: "Reliance Industries Ltd", exchange: "NSE" },
    { symbol: "TCS", name: "Tata Consultancy Services Ltd", exchange: "NSE" },
    { symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE" },
    { symbol: "INFY", name: "Infosys Ltd", exchange: "NSE" },
    { symbol: "ICICIBANK", name: "ICICI Bank Ltd", exchange: "NSE" },
    { symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd", exchange: "NSE" },
    { symbol: "ITC", name: "ITC Ltd", exchange: "NSE" },
    { symbol: "SBIN", name: "State Bank of India", exchange: "NSE" },
    { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", exchange: "NSE" },
    { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd", exchange: "NSE" },
    { symbol: "WIPRO", name: "Wipro Ltd", exchange: "NSE" },
    { symbol: "AXISBANK", name: "Axis Bank Ltd", exchange: "NSE" },
    { symbol: "LT", name: "Larsen & Toubro Ltd", exchange: "NSE" },
    { symbol: "ASIANPAINT", name: "Asian Paints Ltd", exchange: "NSE" },
    { symbol: "MARUTI", name: "Maruti Suzuki India Ltd", exchange: "NSE" },
    { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries Ltd", exchange: "NSE" },
    { symbol: "TITAN", name: "Titan Company Ltd", exchange: "NSE" },
    { symbol: "ULTRACEMCO", name: "UltraTech Cement Ltd", exchange: "NSE" },
    { symbol: "NESTLEIND", name: "Nestle India Ltd", exchange: "NSE" },
    { symbol: "TECHM", name: "Tech Mahindra Ltd", exchange: "NSE" },
    { symbol: "NIFTY", name: "Nifty 50", exchange: "NSE" },
    { symbol: "BANKNIFTY", name: "Nifty Bank", exchange: "NSE" },
    { symbol: "SENSEX", name: "BSE Sensex", exchange: "BSE" },
  ];
  return equities.map((e) => ({
    exchange: e.exchange,
    exchange_token: Math.floor(Math.random() * 99999).toString(),
    trading_symbol: e.symbol,
    groww_symbol: `${e.exchange}-${e.symbol}`,
    name: e.name,
    instrument_type: "EQ",
    segment: "CASH",
    series: "EQ",
    isin: "",
    underlying_symbol: "",
    expiry_date: "",
    strike_price: "",
    lot_size: "1",
    tick_size: "0.05",
  }));
}

export async function ensureInstruments(): Promise<void> {
  if (!instruments.length || Date.now() - lastFetchedAt > REFRESH_INTERVAL_MS) {
    await fetchInstruments();
  }
}

export function searchInstruments(query: string, limit = 20): Instrument[] {
  if (!query || query.length < 1) {
    // Return popular defaults
    return instruments
      .filter((i) => i.segment === "CASH" && POPULAR_SYMBOLS.includes(i.trading_symbol))
      .slice(0, limit);
  }
  const q = query.toUpperCase().trim();
  const results: Array<{ inst: Instrument; score: number }> = [];

  for (const inst of instruments) {
    let score = 0;
    const sym = inst.trading_symbol.toUpperCase();
    const name = (inst.name || "").toUpperCase();

    if (sym === q) score = 100;
    else if (sym.startsWith(q)) score = 80;
    else if (name.startsWith(q)) score = 60;
    else if (sym.includes(q)) score = 40;
    else if (name.includes(q)) score = 20;

    if (score > 0) results.push({ inst, score });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.inst);
}

export function getInstrumentBySymbol(exchange: string, symbol: string): Instrument | undefined {
  return instruments.find(
    (i) => i.exchange === exchange && i.trading_symbol === symbol
  );
}

// Initialize on module load
ensureInstruments().catch(console.error);
