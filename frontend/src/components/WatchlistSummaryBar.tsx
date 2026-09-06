import { WatchlistItem, QuoteData } from "../types";
import { useStore } from "../store/watchlistStore";

interface Props {
  items: WatchlistItem[];
  quotes: Record<string, QuoteData>;
}

function fmtNum(n: number | undefined | null, dec = 2) {
  if (n === undefined || n === null || isNaN(n)) return "--";
  return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtVol(n: number | undefined | null) {
  if (!n) return "--";
  if (n >= 10000000) return (n / 10000000).toFixed(1) + "Cr";
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default function WatchlistSummaryBar({ items, quotes }: Props) {
  const { setSelectedStockItem, setShowDriftPanel, driftReport } = useStore();

  if (items.length === 0) return null;

  const validItems = items
    .map((item) => ({
      item,
      quote: quotes[`${item.exchange}:${item.trading_symbol}`],
    }))
    .filter((x): x is { item: WatchlistItem; quote: QuoteData } => !!x.quote && !isNaN(x.quote.ltp));

  if (validItems.length === 0) return null;

  // 1. Equal-weighted model portfolio return
  const avgDayChangePerc =
    validItems.reduce((acc, curr) => acc + curr.quote.day_change_perc, 0) / validItems.length;
  const isBasketUp = avgDayChangePerc >= 0;

  // 2. Advances / Declines
  const advances = validItems.filter((x) => x.quote.day_change_perc > 0).length;
  const declines = validItems.filter((x) => x.quote.day_change_perc < 0).length;
  const unchanged = validItems.filter((x) => x.quote.day_change_perc === 0).length;

  // 3. Top Gainer and Top Loser
  const sortedByPerf = [...validItems].sort(
    (a, b) => b.quote.day_change_perc - a.quote.day_change_perc
  );
  const topGainer = sortedByPerf[0];
  const topLoser = sortedByPerf[sortedByPerf.length - 1];

  // 4. Combined Volume
  const totalVolume = validItems.reduce((acc, curr) => acc + (curr.quote.volume || 0), 0);

  // 5. Drift count
  const driftMap = new Map((driftReport?.data || []).map((d) => [`${d.exchange}:${d.symbol}`, d]));
  const hotCount = items.filter(
    (i) => driftMap.get(`${i.exchange}:${i.trading_symbol}`)?.badge === "hot"
  ).length;
  const movingCount = items.filter(
    (i) => driftMap.get(`${i.exchange}:${i.trading_symbol}`)?.badge === "moving"
  ).length;

  const topGainerIsUp = topGainer ? topGainer.quote.day_change_perc >= 0 : true;
  const topLoserIsUp = topLoser ? topLoser.quote.day_change_perc >= 0 : false;

  return (
    <div className="watchlist-summary-bar">
      <div className="summary-scroll-track">
        {/* Model Portfolio Basket Change */}
        <div className="summary-metric-group">
          <span className="summary-label">Basket</span>
          <div className="summary-value-row">
            <span className={`basket-pill ${isBasketUp ? "up" : "dn"}`}>
              {isBasketUp ? "▲ +" : "▼ "}{Math.abs(avgDayChangePerc).toFixed(2)}%
            </span>
            <div className="breadth-pills">
              <span className="breadth-tag up" title={`${advances} Advances`}>
                ▲{advances}
              </span>
              <span className="breadth-tag dn" title={`${declines} Declines`}>
                ▼{declines}
              </span>
              {unchanged > 0 && (
                <span className="breadth-tag neutral" title={`${unchanged} Unchanged`}>
                  ●{unchanged}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="summary-divider" />

        {/* Top Performer (Top Gainer) */}
        {topGainer && (
          <div
            className="summary-stock-chip gainer"
            onClick={() => setSelectedStockItem(topGainer.item)}
            title={`Top Performer in Watchlist: ${topGainer.item.trading_symbol}`}
          >
            <span className="chip-prefix">🚀 Top</span>
            <span className="chip-symbol">{topGainer.item.trading_symbol}</span>
            <span className={`chip-chg ${topGainerIsUp ? "up" : "dn"}`}>
              {topGainerIsUp ? "+" : ""}{topGainer.quote.day_change_perc.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Lowest Performer (Top Loser) */}
        {topLoser && validItems.length >= 2 && (
          <div
            className="summary-stock-chip loser"
            onClick={() => setSelectedStockItem(topLoser.item)}
            title={`Lagging Performer in Watchlist: ${topLoser.item.trading_symbol}`}
          >
            <span className="chip-prefix">📉 Low</span>
            <span className="chip-symbol">{topLoser.item.trading_symbol}</span>
            <span className={`chip-chg ${topLoserIsUp ? "up" : "dn"}`}>
              {topLoserIsUp ? "+" : ""}{topLoser.quote.day_change_perc.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Drift Intelligence Trigger */}
        {(hotCount > 0 || movingCount > 0) && (
          <button
            className="summary-drift-btn"
            onClick={() => setShowDriftPanel(true)}
            title="View meaningful changes"
          >
            {hotCount > 0 ? `🔥 ${hotCount} Breakout` : `⚡ ${movingCount} Active`}
          </button>
        )}

        {/* Total Watchlist Volume */}
        <div className="summary-stat desktop-only">
          <span className="summary-label">Total Vol</span>
          <span className="summary-stat-val">{fmtVol(totalVolume)}</span>
        </div>
      </div>
    </div>
  );
}
