import { useEffect, useCallback } from "react";
import { useStore } from "./store/watchlistStore";
import { api } from "./store/api";
import { useLiveQuotes } from "./hooks/useLiveQuotes";
import MarketStatusBar from "./components/MarketStatusBar";
import Sidebar from "./components/Sidebar";
import WatchlistGrid from "./components/WatchlistGrid";
import SearchModal from "./components/SearchModal";
import CreateWatchlistModal from "./components/CreateWatchlistModal";
import TokenSetupModal from "./components/TokenSetupModal";
import SinceYouLeftPanel from "./components/SinceYouLeftPanel";
import StockDetailModal from "./components/StockDetailModal";
import "./index.css";

export default function App() {
  const { sessionId, setWatchlists } = useStore();

  const loadWatchlists = useCallback(async () => {
    try {
      const data = await api.getWatchlists(sessionId);
      setWatchlists(data);
    } catch (err) {
      console.error("Failed to load watchlists:", err);
    }
  }, [sessionId, setWatchlists]);

  useEffect(() => {
    loadWatchlists();
  }, [loadWatchlists]);

  // Start live polling (uses visibilitychange for snapshot saves)
  useLiveQuotes();

  return (
    <div className="app">
      <MarketStatusBar />
      <div className="main-content">
        <Sidebar onRefresh={loadWatchlists} />
        <div className="watchlist-area">
          <WatchlistGrid onRefresh={loadWatchlists} />
        </div>
      </div>

      <SearchModal onAdded={loadWatchlists} />
      <CreateWatchlistModal onCreated={loadWatchlists} />
      <TokenSetupModal />
      <SinceYouLeftPanel />
      <StockDetailModal onRemoveStock={loadWatchlists} />
    </div>
  );
}
