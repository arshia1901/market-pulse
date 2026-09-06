import { useRef, useEffect, useState } from "react";
import { WatchlistItem, QuoteData, DriftResult } from "../types";
import { useStore } from "../store/watchlistStore";
import Sparkline from "./Sparkline";

interface Props {
  item: WatchlistItem;
  quote: QuoteData | undefined;
  drift: DriftResult | undefined;
  onRemove: () => void;
}

function fmtNum(n: number, dec = 2) {
  if (n === undefined || n === null || isNaN(n)) return "--";
  return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtVol(n: number) {
  if (!n) return "--";
  if (n >= 10000000) return (n / 10000000).toFixed(1) + "Cr";
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default function StockCard({ item, quote, drift, onRemove }: Props) {
  const { setSelectedStockItem } = useStore();
  const prevLtp = useRef<number | null>(null);
  const [tickDirection, setTickDirection] = useState<"up" | "dn" | null>(null);

  useEffect(() => {
    if (!quote?.ltp) return;
    if (prevLtp.current !== null && prevLtp.current !== quote.ltp) {
      const dir = quote.ltp > prevLtp.current ? "up" : "dn";
      setTickDirection(dir);
      const timer = setTimeout(() => setTickDirection(null), 800);
      prevLtp.current = quote.ltp;
      return () => clearTimeout(timer);
    }
    prevLtp.current = quote.ltp;
  }, [quote?.ltp]);

  const isUp = quote ? quote.day_change_perc >= 0 : true;
  const hasDrift = drift && drift.priceDelta !== 0;
  const driftUp = hasDrift && drift.priceDelta > 0;

  return (
    <div
      className="stock-row"
      onClick={() => setSelectedStockItem(item)}
      role="button"
      tabIndex={0}
      title={`Click to view detailed metrics for ${item.trading_symbol}`}
    >
      {/* 1. Left: Symbol & Company Name */}
      <div className="stock-info">
        <div className="stock-title-line">
          <span className="stock-symbol">{item.trading_symbol}</span>
          <span className="stock-exchange-badge">{item.exchange}</span>
          {quote?.is_stale && <span className="stale-dot" title="Data delayed" />}
        </div>
        <div className="stock-sub-line">
          <span className="stock-name">{item.name || item.trading_symbol}</span>
          {drift?.badge === "hot" && (
            <span className="mobile-signal-pill hot">🔥 Hot</span>
          )}
          {drift?.badge === "moving" && (
            <span className="mobile-signal-pill moving">⚡ Active</span>
          )}
        </div>
      </div>

      {/* 2. Middle: Sparkline Chart (Desktop / Tablet) */}
      <div className="sparkline-cell desktop-only">
        {quote ? (
          <Sparkline
            open={quote.open}
            high={quote.high}
            low={quote.low}
            close={quote.ltp}
            isUp={isUp}
            width={85}
            height={24}
          />
        ) : (
          <div className="skeleton" style={{ height: 24, width: 75 }} />
        )}
      </div>

      {/* 3 & 4: Right group (LTP + Change Pill) */}
      <div className="stock-right-group">
        {/* LTP & Delta */}
        <div className="stock-ltp">
          {quote ? (
            <>
              <div className={`ltp-value ${tickDirection ? `tick-${tickDirection}` : ""}`}>
                <span className="currency-symbol">₹</span>{fmtNum(quote.ltp)}
                {tickDirection && (
                  <span className={`tick-arrow ${tickDirection}`}>
                    {tickDirection === "up" ? " ▲" : " ▼"}
                  </span>
                )}
              </div>
              {hasDrift ? (
                <div className={`ltp-since ${driftUp ? "up" : "dn"}`}>
                  {driftUp ? "▲ +" : "▼ "}{Math.abs(drift.priceDeltaPerc).toFixed(2)}%
                </div>
              ) : (
                <div className="ltp-since neutral desktop-only">
                  O: ₹{fmtNum(quote.open)}
                </div>
              )}
            </>
          ) : (
            <div className="skeleton" style={{ height: 18, width: 65, marginLeft: "auto" }} />
          )}
        </div>

        {/* Day Change Pill */}
        <div className="day-change-cell">
          {quote ? (
            <>
              <div className={`change-pill ${isUp ? "up" : "dn"}`}>
                {isUp ? "▲ +" : "▼ "}{Math.abs(quote.day_change_perc).toFixed(2)}%
              </div>
              <div className={`day-diff-raw ${isUp ? "up" : "dn"} desktop-only`}>
                {isUp ? "+" : ""}₹{fmtNum(quote.day_change)}
              </div>
            </>
          ) : (
            <div className="skeleton" style={{ height: 26, width: 70, marginLeft: "auto" }} />
          )}
        </div>
      </div>

      {/* 5. Desktop Signal / Volume (Desktop Only) */}
      <div className="signal-cell desktop-only">
        {drift?.badge === "hot" ? (
          <span className="clean-signal-chip hot" title={drift.signals.map(s => s.label).join(", ")}>
            🔥 {drift.signals[0]?.label || "Hot Move"}
          </span>
        ) : drift?.badge === "moving" ? (
          <span className="clean-signal-chip moving" title={drift.signals.map(s => s.label).join(", ")}>
            ⚡ {drift.signals[0]?.label || "Active"}
          </span>
        ) : (
          <span className="clean-signal-chip calm">
            Vol: {quote ? fmtVol(quote.volume) : "--"}
          </span>
        )}
      </div>

      {/* 6. Quick Remove (Desktop Only) */}
      <button
        className="del-btn desktop-only"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Remove from watchlist"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
