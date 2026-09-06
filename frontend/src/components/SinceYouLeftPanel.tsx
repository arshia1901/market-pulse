import { useStore } from "../store/watchlistStore";
import { DriftResult } from "../types";

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtNum(n: number, dec = 2) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function SinceYouLeftPanel() {
  const { driftReport, showDriftPanel, setShowDriftPanel } = useStore();

  if (!showDriftPanel || !driftReport || !driftReport.hasSnapshot) return null;

  const items = driftReport.data || [];
  const hotItems = items.filter(i => i.badge === "hot");
  const movingItems = items.filter(i => i.badge === "moving");
  const shownItems = [...hotItems, ...movingItems].slice(0, 6);
  const lastSeen = driftReport.lastSeenAt ? timeAgo(driftReport.lastSeenAt) : "your last visit";

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDriftPanel(false); }}>
      <div className="drift-panel">
        <div className="drift-panel-header">
          <div>
            <div className="drift-panel-title">Meaningful Changes Since Return</div>
            <div className="drift-panel-sub">
              Last active {lastSeen} ·{" "}
              {hotItems.length > 0 && (
                <strong style={{ color: "#fb923c" }}>
                  {hotItems.length} Breakout{hotItems.length > 1 ? "s" : ""}
                </strong>
              )}
              {hotItems.length > 0 && movingItems.length > 0 && " · "}
              {movingItems.length > 0 && (
                <strong style={{ color: "#60a5fa" }}>
                  {movingItems.length} Active Mover{movingItems.length > 1 ? "s" : ""}
                </strong>
              )}
              {hotItems.length === 0 && movingItems.length === 0 && (
                <span style={{ color: "var(--text-tertiary)" }}>All Steady</span>
              )}
            </div>
          </div>
          <button className="drift-panel-close" onClick={() => setShowDriftPanel(false)}>×</button>
        </div>

        {shownItems.length === 0 ? (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
            Markets are calm. No significant drift detected across your watchlist.
          </div>
        ) : (
          shownItems.map((item: DriftResult) => {
            const isUp = item.priceDeltaPerc >= 0;
            return (
              <div key={`${item.exchange}:${item.symbol}`} className="drift-item">
                <div className="drift-item-top">
                  <div>
                    <div className="drift-sym">{item.symbol}</div>
                    <div className="drift-name">{item.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className={`drift-delta ${isUp ? "up" : "dn"}`}>
                      {isUp ? "+" : ""}{item.priceDeltaPerc.toFixed(2)}%
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                      {isUp ? "+" : ""}₹{fmtNum(item.priceDelta)} since return
                    </div>
                  </div>
                </div>
                {item.signals.length > 0 && (
                  <div className="drift-signals">
                    {item.signals.map((sig, i) => (
                      <span key={i} className={`signal-chip ${sig.severity}`}>{sig.label}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {items.length > shownItems.length && (
          <div style={{ padding: "12px 24px", fontSize: 11, color: "var(--text-tertiary)", textAlign: "center" }}>
            +{items.length - shownItems.length} more instruments tracked
          </div>
        )}

        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => setShowDriftPanel(false)}
            className="btn-primary"
            style={{ width: "100%", padding: "10px", borderRadius: 8 }}
          >
            Back to Watchlist
          </button>
        </div>
      </div>
    </div>
  );
}
