import { useEffect } from "react";
import { useStore } from "../store/watchlistStore";
import { api } from "../store/api";
import Sparkline from "./Sparkline";

function fmtNum(n: number | undefined | null, dec = 2) {
  if (n === undefined || n === null || isNaN(n)) return "--";
  return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtVol(n: number | undefined | null) {
  if (!n) return "--";
  if (n >= 10000000) return (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return (n / 100000).toFixed(2) + " L";
  if (n >= 1000) return (n / 1000).toFixed(1) + " K";
  return n.toString();
}

interface Props {
  onRemoveStock?: () => void;
}

export default function StockDetailModal({ onRemoveStock }: Props) {
  const {
    selectedStockItem,
    setSelectedStockItem,
    quotes,
    driftReport,
    activeWatchlistId,
    sessionId,
    isDemoMode,
  } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedStockItem(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSelectedStockItem]);

  if (!selectedStockItem) return null;

  const key = `${selectedStockItem.exchange}:${selectedStockItem.trading_symbol}`;
  const quote = quotes[key];
  const drift = (driftReport?.data || []).find(
    (d) => d.exchange === selectedStockItem.exchange && d.symbol === selectedStockItem.trading_symbol
  );

  const isUp = quote ? quote.day_change_perc >= 0 : true;
  const ltp = quote?.ltp ?? 0;
  const open = quote?.open ?? ltp;
  const high = quote?.high ?? ltp;
  const low = quote?.low ?? ltp;
  const close = quote?.close ?? (open || ltp);
  const low52 = quote?.low_52w ?? (low * 0.82);
  const high52 = quote?.high_52w ?? (high * 1.25);

  // Calculate day range percentage for the visual bar
  const dayRangeSpread = high - low;
  const dayPositionPct = dayRangeSpread > 0 ? Math.min(100, Math.max(0, ((ltp - low) / dayRangeSpread) * 100)) : 50;

  // 52W range percentage
  const range52Spread = high52 - low52;
  const pos52Pct = range52Spread > 0 ? Math.min(100, Math.max(0, ((ltp - low52) / range52Spread) * 100)) : 50;

  const handleRemove = async () => {
    if (!activeWatchlistId) return;
    try {
      await api.removeFromWatchlist(
        sessionId,
        activeWatchlistId,
        selectedStockItem.exchange,
        selectedStockItem.trading_symbol
      );
      setSelectedStockItem(null);
      onRemoveStock?.();
    } catch (err) {
      console.error("Failed to remove stock", err);
    }
  };

  const handleCopySymbol = () => {
    navigator.clipboard.writeText(selectedStockItem.trading_symbol);
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedStockItem(null);
      }}
    >
      <div className="stock-detail-modal">
        {/* Header (Fixed) with Price & Change on Right */}
        <div className="stock-detail-header">
          {/* Left: Symbol, Exchange Badge, Name */}
          <div className="stock-detail-title-group">
            <div className="stock-detail-sym-row">
              <span className="stock-detail-symbol">{selectedStockItem.trading_symbol}</span>
              <span className="stock-detail-exch-badge">{selectedStockItem.exchange}</span>
              <span className="stock-detail-seg-badge">{selectedStockItem.segment || "CASH"}</span>
            </div>
            <div className="stock-detail-name">{selectedStockItem.name || selectedStockItem.trading_symbol}</div>
          </div>

          {/* Right: Live LTP + Change Pill + Close Button */}
          <div className="stock-detail-header-right">
            <div className="stock-detail-header-price-group">
              <div className="stock-detail-header-ltp">
                <span className="currency">₹</span>{fmtNum(ltp)}
              </div>
              <div className={`stock-detail-change-pill ${isUp ? "up" : "dn"}`}>
                {isUp ? "▲ +" : "▼ "}{fmtNum(Math.abs(quote?.day_change || 0))} ({isUp ? "+" : ""}{fmtNum(quote?.day_change_perc || 0)}%)
              </div>
            </div>
            <button className="drift-panel-close" onClick={() => setSelectedStockItem(null)} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="stock-detail-body">
          {/* Intraday Sparkline Card */}
          {quote && (
            <div className="stock-detail-chart-card">
              <div className="chart-card-header">
                <span className="chart-label">Intraday Trajectory</span>
                <span className="chart-range">L: ₹{fmtNum(low)} — H: ₹{fmtNum(high)}</span>
              </div>
              <div className="chart-canvas-wrap">
                <Sparkline
                  open={open}
                  high={high}
                  low={low}
                  close={ltp}
                  isUp={isUp}
                  width={360}
                  height={60}
                />
              </div>
            </div>
          )}

          {/* Day Range Visual Progress Bar */}
          <div className="stock-detail-range-section">
            <div className="range-header">
              <span className="range-title">Day's Range</span>
              <span className="range-current">₹{fmtNum(ltp)}</span>
            </div>
            <div className="range-bar-track">
              <div
                className="range-bar-fill"
                style={{
                  width: `${dayPositionPct}%`,
                  background: isUp ? "linear-gradient(90deg, #15803d, #22c55e)" : "linear-gradient(90deg, #b91c1c, #ef4444)",
                }}
              />
              <div
                className="range-marker"
                style={{ left: `${dayPositionPct}%` }}
                title={`Current: ₹${fmtNum(ltp)}`}
              />
            </div>
            <div className="range-labels">
              <span>Low: ₹{fmtNum(low)}</span>
              <span>High: ₹{fmtNum(high)}</span>
            </div>
          </div>

          {/* 52-Week Range Progress Bar */}
          <div className="stock-detail-range-section">
            <div className="range-header">
              <span className="range-title">52-Week Range</span>
              <span className="range-current" style={{ color: "var(--text-secondary)" }}>
                {low52 && high52 ? `${(((ltp - low52) / (high52 - low52)) * 100).toFixed(0)}% of 52W range` : "--"}
              </span>
            </div>
            <div className="range-bar-track">
              <div
                className="range-bar-fill"
                style={{
                  width: `${pos52Pct}%`,
                  background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                }}
              />
              <div
                className="range-marker"
                style={{ left: `${pos52Pct}%` }}
                title={`52W Position: ${pos52Pct.toFixed(0)}%`}
              />
            </div>
            <div className="range-labels">
              <span>52W L: ₹{fmtNum(low52)}</span>
              <span>52W H: ₹{fmtNum(high52)}</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="stock-detail-grid">
            <div className="metric-cell">
              <span className="label">Open</span>
              <span className="value">₹{fmtNum(open)}</span>
            </div>
            <div className="metric-cell">
              <span className="label">Prev Close</span>
              <span className="value">₹{fmtNum(close)}</span>
            </div>
            <div className="metric-cell">
              <span className="label">Day High</span>
              <span className="value up">₹{fmtNum(high)}</span>
            </div>
            <div className="metric-cell">
              <span className="label">Day Low</span>
              <span className="value dn">₹{fmtNum(low)}</span>
            </div>
            <div className="metric-cell">
              <span className="label">Volume</span>
              <span className="value">{fmtVol(quote?.volume)}</span>
            </div>
            <div className="metric-cell">
              <span className="label">Lower Circuit</span>
              <span className="value dn">₹{fmtNum(quote?.lower_circuit || low * 0.9)}</span>
            </div>
            <div className="metric-cell">
              <span className="label">Upper Circuit</span>
              <span className="value up">₹{fmtNum(quote?.upper_circuit || high * 1.1)}</span>
            </div>
            <div className="metric-cell">
              <span className="label">Meaningful Drift</span>
              <span className="value" style={{ color: drift?.badge === "hot" ? "#fb923c" : drift?.badge === "moving" ? "#60a5fa" : "var(--text-tertiary)" }}>
                {drift?.badge === "hot" ? "🔥 Hot Breakout" : drift?.badge === "moving" ? "⚡ Active Momentum" : "Steady"}
              </span>
            </div>
          </div>

          {/* Drift Intelligence Signals (if any) */}
          {drift && drift.signals && drift.signals.length > 0 && (
            <div className="stock-detail-drift-box">
              <div className="drift-box-title">⚡ Since You Left Intelligence</div>
              <div className="drift-signals-list">
                {drift.signals.map((sig, i) => (
                  <div key={i} className={`detail-signal-tag ${sig.severity}`}>
                    <span className="tag-dot" />
                    <span className="tag-text">{sig.label}</span>
                  </div>
                ))}
              </div>
              {drift.priceDelta !== 0 && (
                <div className="drift-box-sub">
                  Moved {drift.priceDelta > 0 ? "+" : ""}₹{fmtNum(drift.priceDelta)} ({drift.priceDeltaPerc > 0 ? "+" : ""}{drift.priceDeltaPerc.toFixed(2)}%) since your previous visit.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer (Fixed) */}
        <div className="stock-detail-footer">
          <button className="btn-secondary" onClick={handleCopySymbol} title="Copy symbol to clipboard">
            📋 Copy Symbol
          </button>
          <button className="btn-danger" onClick={handleRemove} title="Remove this stock from the active watchlist">
            🗑 Remove
          </button>
          <button className="btn-primary" onClick={() => setSelectedStockItem(null)}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
