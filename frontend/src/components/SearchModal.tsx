import { useState, useEffect, useCallback } from "react";
import { useStore } from "../store/watchlistStore";
import { api } from "../store/api";
import { Instrument } from "../types";

interface Props {
  onAdded: () => void;
}

export default function SearchModal({ onAdded }: Props) {
  const { showSearchModal, setShowSearchModal, sessionId, searchTargetWatchlistId, watchlists } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const targetWl = watchlists.find(w => w.watchlist_id === searchTargetWatchlistId) ||
                   watchlists.find(w => w.watchlist_id === useStore.getState().activeWatchlistId) ||
                   watchlists[0];

  const alreadyIn = new Set(targetWl?.items.map(i => `${i.exchange}:${i.trading_symbol}`) || []);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const r = await api.searchInstruments(q);
      setResults(r || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showSearchModal) return;
    const t = setTimeout(() => search(query), query ? 180 : 0);
    return () => clearTimeout(t);
  }, [query, showSearchModal, search]);

  useEffect(() => {
    if (showSearchModal) {
      setQuery("");
      setAdded(new Set());
      search("");
    }
  }, [showSearchModal, search]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSearchModal(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [setShowSearchModal]);

  if (!showSearchModal) return null;

  const handleAdd = async (inst: Instrument) => {
    if (!targetWl) return;
    const key = `${inst.exchange}:${inst.trading_symbol}`;
    try {
      await api.addToWatchlist(sessionId, targetWl.watchlist_id, {
        exchange: inst.exchange,
        segment: inst.segment || "CASH",
        trading_symbol: inst.trading_symbol,
        groww_symbol: inst.groww_symbol,
        name: inst.name || inst.trading_symbol,
        watchlist_name: targetWl.watchlist_name,
      });
      setAdded(prev => new Set([...prev, key]));
      onAdded();
    } catch (err) {
      console.error("Add failed", err);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSearchModal(false); }}>
      <div className="search-modal">
        {/* Header */}
        <div className="search-modal-header">
          <div>
            <h2 className="search-modal-title">Search Instruments</h2>
            <div className="search-modal-sub">
              Adding to <strong style={{ color: "var(--text-primary)" }}>{targetWl?.watchlist_name || "Watchlist"}</strong>
            </div>
          </div>
          <button className="drift-panel-close" onClick={() => setShowSearchModal(false)}>×</button>
        </div>

        {/* Input Bar */}
        <div className="search-input-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            className="search-input-field"
            placeholder="Search stock symbol (e.g. RELIANCE, TCS, INFY)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 16 }}
            >
              ×
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="search-results-list">
          {loading && (
            <div className="search-status-message">Searching instruments...</div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="search-status-message">No instruments found matching "{query}"</div>
          )}
          {!loading && results.map(inst => {
            const key = `${inst.exchange}:${inst.trading_symbol}`;
            const isAdded = added.has(key) || alreadyIn.has(key);
            return (
              <div key={key} className="search-result-row">
                <div className="sr-info">
                  <div className="sr-sym-row">
                    <span className="sr-symbol">{inst.trading_symbol}</span>
                    <span className="sr-badge-exch">{inst.exchange}</span>
                    <span className="sr-badge-seg">{inst.segment || "CASH"}</span>
                  </div>
                  <div className="sr-name">{inst.name}</div>
                </div>
                <button
                  className={`sr-add-button ${isAdded ? "added" : ""}`}
                  onClick={() => !isAdded && handleAdd(inst)}
                  disabled={isAdded}
                >
                  {isAdded ? "✓ Added" : "+ Add"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="search-modal-footer">
          <span>Press <kbd className="key-hint">ESC</kbd> to close</span>
          <span>{results.length} instruments available</span>
        </div>
      </div>
    </div>
  );
}
