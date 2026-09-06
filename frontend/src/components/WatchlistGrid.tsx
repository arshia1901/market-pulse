import { useState, useCallback, useEffect } from "react";
import { useStore } from "../store/watchlistStore";
import { api } from "../store/api";
import { WatchlistItem } from "../types";
import StockCard from "./StockCard";
import WatchlistSummaryBar from "./WatchlistSummaryBar";

interface Props {
  onRefresh: () => void;
}

export default function WatchlistGrid({ onRefresh }: Props) {
  const {
    watchlists,
    activeWatchlistId,
    setActiveWatchlist,
    quotes,
    driftReport,
    sessionId,
    setShowSearchModal,
    setShowCreateWatchlistModal,
  } = useStore();
  const [sortByDrift, setSortByDrift] = useState(false);
  const [editName, setEditName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const activeWl = watchlists.find(w => w.watchlist_id === activeWatchlistId);

  useEffect(() => {
    if (activeWl) setEditName(activeWl.watchlist_name);
  }, [activeWl?.watchlist_id, activeWl?.watchlist_name]);

  const driftMap = new Map(
    (driftReport?.data || []).map(d => [`${d.exchange}:${d.symbol}`, d])
  );

  const handleRemove = useCallback(async (item: WatchlistItem) => {
    if (!activeWl) return;
    await api.removeFromWatchlist(sessionId, activeWl.watchlist_id, item.exchange, item.trading_symbol);
    onRefresh();
  }, [activeWl, sessionId, onRefresh]);

  const handleRename = useCallback(async (newName: string) => {
    if (!activeWl || !newName.trim()) return;
    await api.renameWatchlist(sessionId, activeWl.watchlist_id, newName.trim());
    setIsEditing(false);
    onRefresh();
  }, [activeWl, sessionId, onRefresh]);

  const handleDeleteWatchlist = useCallback(async () => {
    if (!activeWl) return;
    if (!confirm(`Delete "${activeWl.watchlist_name}"? This will remove all stocks in it.`)) return;
    await api.deleteWatchlist(sessionId, activeWl.watchlist_id);
    onRefresh();
  }, [activeWl, sessionId, onRefresh]);

  if (!activeWl) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📈</div>
        <div className="empty-title">Select or Create a Watchlist</div>
        <button
          className="btn-add"
          style={{ marginTop: 12 }}
          onClick={() => setShowCreateWatchlistModal(true)}
        >
          + Create Watchlist
        </button>
      </div>
    );
  }

  let items = [...activeWl.items];

  // Sort by drift score if requested
  if (sortByDrift && driftMap.size > 0) {
    items = items.sort((a, b) => {
      const da = driftMap.get(`${a.exchange}:${a.trading_symbol}`)?.score ?? 0;
      const db = driftMap.get(`${b.exchange}:${b.trading_symbol}`)?.score ?? 0;
      return db - da;
    });
  }

  const hotCount = items.filter(i => driftMap.get(`${i.exchange}:${i.trading_symbol}`)?.badge === "hot").length;
  const movingCount = items.filter(i => driftMap.get(`${i.exchange}:${i.trading_symbol}`)?.badge === "moving").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* Mobile Horizontal Watchlist Pills */}
      <div className="mobile-watchlist-pills">
        {watchlists.map(wl => (
          <button
            key={wl.watchlist_id}
            className={`mobile-wl-pill ${activeWatchlistId === wl.watchlist_id ? "active" : ""}`}
            onClick={() => setActiveWatchlist(wl.watchlist_id)}
          >
            <span>{wl.watchlist_name}</span>
            <span className="pill-count">{wl.items.length}</span>
          </button>
        ))}
        <button
          className="mobile-wl-pill add-new"
          onClick={() => setShowCreateWatchlistModal(true)}
        >
          + New
        </button>
      </div>

      {/* Clean Watchlist Header */}
      <div className="watchlist-header">
        <div className="watchlist-name-group">
          <input
            className="watchlist-edit-name"
            value={isEditing ? editName : activeWl.watchlist_name}
            onFocus={() => {
              setIsEditing(true);
              setEditName(activeWl.watchlist_name);
            }}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => handleRename(editName)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setEditName(activeWl.watchlist_name);
                setIsEditing(false);
              }
            }}
          />
          <span className="watchlist-count">{activeWl.items.length}</span>
          {(hotCount > 0 || movingCount > 0) && (
            <button
              className="sort-indicator"
              title={`Meaningful Changes: ${hotCount} breakout moves, ${movingCount} active`}
              onClick={() => useStore.getState().setShowDriftPanel(true)}
              style={{ background: "rgba(249, 115, 22, 0.12)", border: "1px solid rgba(249, 115, 22, 0.25)", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {hotCount > 0 ? `🔥 ${hotCount} Breakout` : `⚡ ${movingCount} Active`}
            </button>
          )}
        </div>

        <div className="header-actions">
          {driftMap.size > 0 && (
            <button
              className="btn-icon"
              title={sortByDrift ? "Default Order" : "Sort by Meaningful Drift"}
              onClick={() => setSortByDrift(!sortByDrift)}
              style={sortByDrift ? { background: "rgba(59, 130, 246, 0.15)", borderColor: "#3b82f6", color: "#60a5fa" } : {}}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M7 12h10M11 18h2"/>
              </svg>
            </button>
          )}
          <button className="btn-danger" title="Delete Watchlist" onClick={handleDeleteWatchlist}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
          <button className="btn-add" onClick={() => setShowSearchModal(true, activeWl.watchlist_id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Stock Rows */}
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-title">Watchlist is empty</div>
          <div className="empty-sub">Search and add stocks from NSE or BSE to begin tracking</div>
          <button className="btn-add" style={{ marginTop: 8 }} onClick={() => setShowSearchModal(true, activeWl.watchlist_id)}>
            + Add First Stock
          </button>
        </div>
      ) : (
        <div className="stock-table">
          <div className="table-head">
            <span>Instrument</span>
            <span className="center desktop-only">Intraday</span>
            <div className="table-head-right-group">
              <span className="right">Price</span>
              <span className="right">Change</span>
            </div>
            <span className="right desktop-only">Signal</span>
            <span className="desktop-only"></span>
          </div>
          {items.map(item => {
            const key = `${item.exchange}:${item.trading_symbol}`;
            return (
              <StockCard
                key={key}
                item={item}
                quote={quotes[key]}
                drift={driftMap.get(key)}
                onRemove={() => handleRemove(item)}
              />
            );
          })}
        </div>
      )}

      {/* Model Portfolio & Aggregate Summary Dock */}
      <WatchlistSummaryBar items={items} quotes={quotes} />
    </div>
  );
}
