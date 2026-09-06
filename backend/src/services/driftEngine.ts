import { QuoteData, Snapshot, DriftResult, DriftSignal } from "../types";

// DriftScore weights
const WEIGHTS = {
  priceDelta: 0.50,
  volumeSpike: 0.25,
  circuit52w: 0.15,
  circuitProximity: 0.10,
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalize(val: number, threshold: number, maxVal: number): number {
  return clamp(Math.abs(val) / maxVal, 0, 1);
}

export function computeDriftScore(
  symbol: string,
  exchange: string,
  current: QuoteData,
  snapshot: Snapshot
): DriftResult {
  const signals: DriftSignal[] = [];

  // 1. Price delta since last seen (50% weight)
  const priceDelta = current.ltp - snapshot.ltp;
  const priceDeltaPerc = snapshot.ltp > 0 ? (priceDelta / snapshot.ltp) * 100 : 0;
  const absPercDelta = Math.abs(priceDeltaPerc);
  const priceScore = normalize(absPercDelta, 0.5, 4); // 4% = max

  if (absPercDelta >= 0.8) {
    signals.push({
      type: "price_move",
      label: `${priceDeltaPerc > 0 ? "+" : ""}${priceDeltaPerc.toFixed(2)}% since you left`,
      severity: absPercDelta >= 2.5 ? "high" : absPercDelta >= 1.2 ? "medium" : "low",
    });
  }

  // 2. Volume surge relative to snapshot baseline (25% weight)
  let volumeScore = 0;
  if (snapshot.volume > 0 && current.volume > snapshot.volume * 1.4) {
    const volumeRatio = current.volume / snapshot.volume;
    volumeScore = clamp((volumeRatio - 1) / 2.5, 0, 1);
    signals.push({
      type: "volume_spike",
      label: `${volumeRatio.toFixed(1)}x volume surge`,
      severity: volumeRatio >= 2.5 ? "high" : "medium",
    });
  }

  // 3. New 52W High / Low Breach (only if price moved towards it)
  let circuit52wScore = 0;
  if (absPercDelta >= 0.5) {
    if (current.high_52w && current.ltp >= current.high_52w * 0.995 && priceDelta > 0) {
      circuit52wScore = 1;
      signals.push({ type: "52w_high", label: "Breaking 52W High", severity: "high" });
    } else if (current.low_52w && current.ltp <= current.low_52w * 1.005 && priceDelta < 0) {
      circuit52wScore = 1;
      signals.push({ type: "52w_low", label: "Breaking 52W Low", severity: "high" });
    }
  }

  // 4. Circuit breaker proximity (only if price surged towards limit)
  let circuitScore = 0;
  if (current.upper_circuit > 0 && priceDelta > 0) {
    const distToUpper = (current.upper_circuit - current.ltp) / current.upper_circuit;
    if (distToUpper < 0.02) {
      circuitScore = 1;
      signals.push({ type: "upper_circuit", label: "Near Upper Circuit", severity: "high" });
    }
  } else if (current.lower_circuit > 0 && priceDelta < 0) {
    const distToLower = (current.ltp - current.lower_circuit) / current.ltp;
    if (distToLower < 0.02) {
      circuitScore = 1;
      signals.push({ type: "lower_circuit", label: "Near Lower Circuit", severity: "high" });
    }
  }

  // Calculate composite score only when there's an actual change
  let score = 0;
  if (absPercDelta > 0.2 || volumeScore > 0 || circuitScore > 0) {
    score = clamp(
      priceScore * WEIGHTS.priceDelta +
      volumeScore * WEIGHTS.volumeSpike +
      circuit52wScore * WEIGHTS.circuit52w +
      circuitScore * WEIGHTS.circuitProximity,
      0, 1
    );
  }

  const badge: "hot" | "moving" | "calm" =
    score >= 0.45 ? "hot" : score >= 0.2 ? "moving" : "calm";

  return {
    symbol,
    exchange,
    score: Math.round(score * 100) / 100,
    badge,
    priceDelta: Math.round(priceDelta * 100) / 100,
    priceDeltaPerc: Math.round(priceDeltaPerc * 100) / 100,
    signals,
    lastSeenAt: snapshot.timestamp,
  };
}
