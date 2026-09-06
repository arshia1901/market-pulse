import { useEffect, useState } from "react";
import { useStore } from "../store/watchlistStore";
import { api } from "../store/api";
import { QuoteData } from "../types";

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MarketStatusBar() {
  const { apiToken, isDemoMode, marketOpen, setMarketOpen, setShowTokenSetup, mobileSidebarOpen, setMobileSidebarOpen } = useStore();
  const [indices, setIndices] = useState<Record<string, QuoteData>>({});
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const checkMarket = () => {
      const now = new Date();
      const istOffset = 5.5 * 60;
      const istMs = now.getTime() + (istOffset - now.getTimezoneOffset()) * 60000;
      const ist = new Date(istMs);
      const h = ist.getHours(), m = ist.getMinutes(), d = ist.getDay();
      setMarketOpen(d >= 1 && d <= 5 && (h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30)));
    };
    checkMarket();
    const iv = setInterval(checkMarket, 60000);
    return () => clearInterval(iv);
  }, [setMarketOpen]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.getIndices(apiToken);
        setIndices(data);
        setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 5000);
    return () => clearInterval(iv);
  }, [apiToken]);

  const indexList = [
    { key: "NSE:NIFTY", label: "NIFTY 50" },
    { key: "NSE:BANKNIFTY", label: "BANK NIFTY" },
    { key: "BSE:SENSEX", label: "SENSEX" },
  ];

  return (
    <>
      <div className="market-bar">
        <div className="market-bar-left">
          {/* Mobile Hamburger Menu Toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Toggle Watchlists"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <div className="market-bar-brand">
            <div className="brand-logo">▲</div>
            <span className="brand-name">Pulse</span>
          </div>

          <div className={`market-status-pill ${marketOpen ? "open" : "closed"}`}>
            <div className="dot" />
            <span className="status-text">{marketOpen ? "Open" : "Closed"}</span>
          </div>

          {/* Desktop Index Tickers */}
          <div className="index-tickers-container desktop-only">
            {indexList.map((idx, i) => {
              const q = indices[idx.key];
              if (!q) return null;
              const isUp = q.day_change_perc >= 0;
              return (
                <div key={idx.key} className="index-item-wrap">
                  {i > 0 && <div className="index-sep" />}
                  <div className="index-ticker">
                    <span className="name">{idx.label}</span>
                    <span className="ltp">{fmt(q.ltp)}</span>
                    <span className={`chg ${isUp ? "up" : "dn"}`}>
                      {isUp ? "▲ +" : "▼ "}{Math.abs(q.day_change_perc).toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="market-bar-right">
          {lastUpdated && <span className="last-updated desktop-only">{lastUpdated}</span>}
          <button
            className={isDemoMode ? "demo-badge" : "real-badge"}
            onClick={() => setShowTokenSetup(true)}
          >
            {isDemoMode ? "🎭 Demo" : "🔑 Live API"}
          </button>
        </div>
      </div>

      {/* Mobile Dedicated Index Ticker Strip */}
      <div className="mobile-index-bar mobile-only">
        <div className="mobile-index-scroll">
          {indexList.map((idx) => {
            const q = indices[idx.key];
            if (!q) return null;
            const isUp = q.day_change_perc >= 0;
            return (
              <div key={idx.key} className="mobile-index-item">
                <span className="name">{idx.label}</span>
                <span className="ltp">{fmt(q.ltp)}</span>
                <span className={`chg ${isUp ? "up" : "dn"}`}>
                  {isUp ? "▲ +" : "▼ "}{Math.abs(q.day_change_perc).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
