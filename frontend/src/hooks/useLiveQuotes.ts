import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../store/watchlistStore";
import { api } from "../store/api";

const POLL_INTERVAL = 3000;
const MIN_AWAY_TIME_FOR_AUTO_MODAL_MS = 90 * 1000; // 90 seconds

export function useLiveQuotes() {
  const { watchlists, apiToken, sessionId, setQuotes, setDriftReport, setShowDriftPanel } = useStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);
  const awayTimestampRef = useRef<number | null>(null);

  const getAllItems = useCallback(() => {
    const items: Array<{ exchange: string; segment: string; trading_symbol: string }> = [];
    const seen = new Set<string>();
    for (const wl of watchlists) {
      for (const item of wl.items) {
        const key = `${item.exchange}:${item.trading_symbol}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ exchange: item.exchange, segment: item.segment, trading_symbol: item.trading_symbol });
        }
      }
    }
    return items;
  }, [watchlists]);

  const fetchQuotes = useCallback(async () => {
    const items = getAllItems();
    if (items.length === 0) return;
    try {
      const quotes = await api.getBatchLTP(items, apiToken);
      if (quotes && Object.keys(quotes).length > 0) {
        setQuotes(quotes);
      }
    } catch (err) {
      console.error("Quote fetch error:", err);
    }
  }, [getAllItems, apiToken, setQuotes]);

  const saveSnapshot = useCallback(async () => {
    const items = getAllItems();
    if (items.length === 0) return;
    const { quotes } = useStore.getState();
    const snapshots = items
      .filter((item) => quotes[`${item.exchange}:${item.trading_symbol}`])
      .map((item) => ({
        exchange: item.exchange,
        trading_symbol: item.trading_symbol,
        quote: quotes[`${item.exchange}:${item.trading_symbol}`],
      }));
    if (snapshots.length > 0) {
      try {
        await api.saveSnapshots(sessionId, snapshots);
      } catch (err) {
        console.error("Snapshot save error:", err);
      }
    }
  }, [getAllItems, sessionId]);

  const checkDrift = useCallback(async (isReturningFromAway = false) => {
    try {
      const report = await api.getDriftReport(sessionId, apiToken);
      if (report.hasSnapshot && report.data && report.data.length > 0) {
        setDriftReport(report);

        // Only auto-popup modal if user was genuinely away for > 90 seconds and there are hot breakout moves
        const hasHotMoves = report.data.some(d => d.badge === "hot" && Math.abs(d.priceDeltaPerc) >= 0.8);
        const awayDuration = report.lastSeenAt ? Date.now() - report.lastSeenAt : 0;

        if (isReturningFromAway && awayDuration >= MIN_AWAY_TIME_FOR_AUTO_MODAL_MS && hasHotMoves) {
          setShowDriftPanel(true);
        }
      } else {
        setDriftReport(null);
      }
    } catch (err) {
      console.error("Drift check error:", err);
    }
  }, [sessionId, apiToken, setDriftReport, setShowDriftPanel]);

  useEffect(() => {
    // Initial drift calculation without intrusive popup
    checkDrift(false);

    // Tab visibility change detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisibleRef.current = false;
        awayTimestampRef.current = Date.now();
        saveSnapshot();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        isVisibleRef.current = true;
        const wasAway = awayTimestampRef.current !== null && (Date.now() - awayTimestampRef.current > 30000);
        awayTimestampRef.current = null;
        
        checkDrift(wasAway);
        fetchQuotes();
        intervalRef.current = setInterval(fetchQuotes, POLL_INTERVAL);
      }
    };

    const handleBeforeUnload = () => saveSnapshot();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveSnapshot, checkDrift, fetchQuotes]);

  // Polling management
  useEffect(() => {
    const items = getAllItems();
    if (items.length === 0) return;

    fetchQuotes();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchQuotes, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [watchlists, apiToken, fetchQuotes, getAllItems]);
}
