import axios from "axios";
import { QuoteData } from "../types";

// In-memory quote metadata cache (OHLC, 52W high/low, circuits)
const metadataCache = new Map<string, { quote: QuoteData; fetchedAt: number }>();
const METADATA_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Mock price seeds for Demo Mode
const MOCK_PRICES: Record<string, number> = {
  RELIANCE: 1322.00, TCS: 2304.00, HDFCBANK: 712.10, INFY: 1130.00,
  ICICIBANK: 1289.75, HINDUNILVR: 2543.60, ITC: 487.30, SBIN: 845.20,
  BAJFINANCE: 7234.90, KOTAKBANK: 1892.40, WIPRO: 567.85, AXISBANK: 1156.30,
  LT: 3876.20, ASIANPAINT: 3245.75, MARUTI: 12456.80, SUNPHARMA: 1678.40,
  TITAN: 3876.50, ULTRACEMCO: 11234.60, NESTLEIND: 24567.30, TECHM: 1678.90,
  NIFTY: 23897.70, BANKNIFTY: 57369.65, SENSEX: 79450.20,
};

const mockVolatility: Record<string, number> = {};
const priceTracker: Record<string, number> = { ...MOCK_PRICES };

function getMockQuote(symbol: string, exchange: string): QuoteData {
  const baseLTP = MOCK_PRICES[symbol] || 1000;
  if (!priceTracker[symbol]) priceTracker[symbol] = baseLTP;
  if (!mockVolatility[symbol]) mockVolatility[symbol] = (Math.random() - 0.5) * 0.02;

  // Small random walk for demo mode
  const drift = mockVolatility[symbol];
  const noise = (Math.random() - 0.5) * 0.015;
  const reversion = (baseLTP - priceTracker[symbol]) / baseLTP * 0.1;
  const change = priceTracker[symbol] * (drift + noise + reversion);
  priceTracker[symbol] = Math.max(priceTracker[symbol] + change, baseLTP * 0.7);

  const ltp = Math.round(priceTracker[symbol] * 100) / 100;
  const open = Math.round(baseLTP * (1 + (Math.random() - 0.5) * 0.02) * 100) / 100;
  const dayChangePct = Math.round(((ltp - open) / open) * 10000) / 100;
  const dayChange = Math.round((ltp - open) * 100) / 100;
  const high = Math.max(ltp, open) * (1 + Math.random() * 0.01);
  const low = Math.min(ltp, open) * (1 - Math.random() * 0.01);
  const volume = Math.floor(Math.random() * 5000000 + 500000);
  const upperCircuit = Math.round(open * 1.1 * 100) / 100;
  const lowerCircuit = Math.round(open * 0.9 * 100) / 100;

  return {
    ltp,
    day_change: dayChange,
    day_change_perc: dayChangePct,
    volume,
    open,
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    close: open,
    upper_circuit: upperCircuit,
    lower_circuit: lowerCircuit,
    high_52w: Math.round(baseLTP * 1.35 * 100) / 100,
    low_52w: Math.round(baseLTP * 0.68 * 100) / 100,
    timestamp: Date.now(),
  };
}

export function isDemoMode(token?: string): boolean {
  return !token || token === "demo" || token.trim().length < 20;
}

// Fetch live detailed quote for a single instrument from Groww
export async function getQuote(
  exchange: string,
  segment: string,
  symbol: string,
  token?: string
): Promise<QuoteData> {
  const cacheKey = `${exchange || "NSE"}:${symbol}`;

  if (isDemoMode(token)) {
    return getMockQuote(symbol, exchange);
  }

  // Check cache first for metadata to prevent hitting 429 rate limit
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < METADATA_TTL_MS) {
    return cached.quote;
  }

  try {
    const resp = await axios.get("https://api.groww.in/v1/live-data/quote", {
      params: {
        exchange: exchange || "NSE",
        segment: segment || "CASH",
        trading_symbol: symbol,
      },
      headers: {
        Authorization: `Bearer ${token}`,
        "X-API-VERSION": "1.0",
        Accept: "application/json",
      },
      timeout: 6000,
    });

    const p = resp.data?.payload;
    if (!p) {
      if (cached) return cached.quote;
      return getMockQuote(symbol, exchange);
    }

    const ltp = p.last_price || p.ltp || 0;
    const open = p.ohlc?.open || ltp;
    const high = p.ohlc?.high || ltp;
    const low = p.ohlc?.low || ltp;
    const close = p.ohlc?.close || open;
    const dayChange = p.day_change !== undefined ? p.day_change : Math.round((ltp - close) * 100) / 100;
    const dayChangePerc = p.day_change_perc !== undefined ? p.day_change_perc : (close > 0 ? ((ltp - close) / close) * 100 : 0);

    const quoteData: QuoteData = {
      ltp,
      day_change: Math.round(dayChange * 100) / 100,
      day_change_perc: Math.round(dayChangePerc * 100) / 100,
      volume: p.volume || 0,
      open,
      high,
      low,
      close,
      upper_circuit: p.upper_circuit_limit || 0,
      lower_circuit: p.lower_circuit_limit || 0,
      high_52w: p.week_52_high || p.high_52w || 0,
      low_52w: p.week_52_low || p.low_52w || 0,
      timestamp: Date.now(),
      is_stale: false,
    };

    metadataCache.set(cacheKey, { quote: quoteData, fetchedAt: Date.now() });
    return quoteData;
  } catch (err: any) {
    console.error(`[GrowwClient] Quote error for ${symbol}:`, err?.response?.data || err.message);
    if (cached) {
      return { ...cached.quote, is_stale: true };
    }
    return { ...getMockQuote(symbol, exchange), is_stale: true };
  }
}

export async function getLTP(
  exchange: string,
  segment: string,
  symbol: string,
  token?: string
): Promise<QuoteData> {
  return getQuote(exchange, segment, symbol, token);
}

// Single-request batch LTP using Groww's official comma-separated exchange_symbols
export async function getBatchLTP(
  items: Array<{ exchange: string; segment: string; trading_symbol: string }>,
  token?: string
): Promise<Record<string, QuoteData>> {
  const results: Record<string, QuoteData> = {};

  if (isDemoMode(token)) {
    // Generate demo quotes for all items
    for (const item of items) {
      results[`${item.exchange}:${item.trading_symbol}`] = getMockQuote(item.trading_symbol, item.exchange);
    }
    return results;
  }

  try {
    // Group by segment (usually CASH)
    const segmentMap = new Map<string, Array<{ exchange: string; symbol: string }>>();
    for (const item of items) {
      const seg = item.segment || "CASH";
      if (!segmentMap.has(seg)) segmentMap.set(seg, []);
      segmentMap.get(seg)!.push({ exchange: item.exchange || "NSE", symbol: item.trading_symbol });
    }

    for (const [segment, symList] of segmentMap.entries()) {
      // Build comma-separated exchange_symbols e.g. NSE_RELIANCE,NSE_TCS
      const exchangeSymbols = symList.map(s => `${s.exchange}_${s.symbol}`).join(",");

      const resp = await axios.get("https://api.groww.in/v1/live-data/ltp", {
        params: {
          segment,
          exchange_symbols: exchangeSymbols,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "X-API-VERSION": "1.0",
          Accept: "application/json",
        },
        timeout: 6000,
      });

      const payload = resp.data?.payload || {};

      for (const s of symList) {
        const growwKey = `${s.exchange}_${s.symbol}`;
        const key = `${s.exchange}:${s.symbol}`;
        const liveLtp = payload[growwKey];

        // Retrieve existing cached metadata (OHLC, close, etc.)
        const cached = metadataCache.get(key);

        if (liveLtp !== undefined && liveLtp !== null) {
          const close = cached?.quote?.close || cached?.quote?.open || liveLtp;
          const dayChange = Math.round((liveLtp - close) * 100) / 100;
          const dayChangePerc = close > 0 ? Math.round(((liveLtp - close) / close) * 10000) / 100 : 0;

          const updatedQuote: QuoteData = {
            ltp: liveLtp,
            day_change: cached?.quote?.day_change !== undefined ? cached.quote.day_change : dayChange,
            day_change_perc: cached?.quote?.day_change_perc !== undefined ? cached.quote.day_change_perc : dayChangePerc,
            volume: cached?.quote?.volume || 0,
            open: cached?.quote?.open || liveLtp,
            high: cached?.quote?.high ? Math.max(cached.quote.high, liveLtp) : liveLtp,
            low: cached?.quote?.low ? Math.min(cached.quote.low, liveLtp) : liveLtp,
            close: close,
            upper_circuit: cached?.quote?.upper_circuit || 0,
            lower_circuit: cached?.quote?.lower_circuit || 0,
            high_52w: cached?.quote?.high_52w || 0,
            low_52w: cached?.quote?.low_52w || 0,
            timestamp: Date.now(),
            is_stale: false,
          };

          results[key] = updatedQuote;
          metadataCache.set(key, { quote: updatedQuote, fetchedAt: Date.now() });
        } else if (cached) {
          results[key] = cached.quote;
        } else {
          results[key] = getMockQuote(s.symbol, s.exchange);
        }
      }
    }

    // Lazy background-populate full quote metadata for items without metadata
    items.forEach(item => {
      const key = `${item.exchange}:${item.trading_symbol}`;
      if (!metadataCache.has(key)) {
        getQuote(item.exchange, item.segment, item.trading_symbol, token).catch(() => {});
      }
    });

    return results;
  } catch (err: any) {
    console.error("[GrowwClient] Batch LTP error:", err?.response?.data || err.message);
    // Return cached quotes or fallback
    for (const item of items) {
      const key = `${item.exchange}:${item.trading_symbol}`;
      const cached = metadataCache.get(key);
      results[key] = cached ? { ...cached.quote, is_stale: true } : getMockQuote(item.trading_symbol, item.exchange);
    }
    return results;
  }
}
