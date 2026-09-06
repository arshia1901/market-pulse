import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Watchlist, WatchlistItem, QuoteData, DriftReport } from "../types";

interface AppState {
  // Auth
  apiToken: string;
  sessionId: string;
  isDemoMode: boolean;
  setApiToken: (token: string) => void;

  // Watchlists
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  setWatchlists: (lists: Watchlist[]) => void;
  setActiveWatchlist: (id: string) => void;

  // Live Quotes
  quotes: Record<string, QuoteData>;
  setQuote: (key: string, quote: QuoteData) => void;
  setQuotes: (quotes: Record<string, QuoteData>) => void;

  // Drift Report
  driftReport: DriftReport | null;
  showDriftPanel: boolean;
  setDriftReport: (report: DriftReport | null) => void;
  setShowDriftPanel: (show: boolean) => void;

  // UI
  showSearchModal: boolean;
  showTokenSetup: boolean;
  showCreateWatchlistModal: boolean;
  mobileSidebarOpen: boolean;
  searchTargetWatchlistId: string | null;
  setShowSearchModal: (show: boolean, watchlistId?: string) => void;
  setShowTokenSetup: (show: boolean) => void;
  setShowCreateWatchlistModal: (show: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;

  // Selected Stock Details Modal
  selectedStockItem: WatchlistItem | null;
  setSelectedStockItem: (item: WatchlistItem | null) => void;

  // Market Status
  marketOpen: boolean;
  setMarketOpen: (open: boolean) => void;
}

function generateSessionId(): string {
  return "sess_" + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
}

function isMarketOpen(): boolean {
  const now = new Date();
  // IST: UTC+5:30
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const istMinutes = utcHour * 60 + utcMin + 330; // UTC to IST
  const istHour = Math.floor((istMinutes % (24 * 60)) / 60);
  const istMin = istMinutes % 60;
  const totalISTMinutes = istHour * 60 + istMin;
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat

  // Market open Mon-Fri 9:15 AM to 3:30 PM IST
  return (
    dayOfWeek >= 1 &&
    dayOfWeek <= 5 &&
    totalISTMinutes >= 9 * 60 + 15 &&
    totalISTMinutes <= 15 * 60 + 30
  );
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      apiToken: "",
      sessionId: generateSessionId(),
      isDemoMode: true,
      setApiToken: (token) =>
        set({ apiToken: token, isDemoMode: !token || token.length < 10 }),

      watchlists: [],
      activeWatchlistId: null,
      setWatchlists: (lists) => {
        const state = get();
        set({
          watchlists: lists,
          activeWatchlistId:
            state.activeWatchlistId && lists.find((l) => l.watchlist_id === state.activeWatchlistId)
              ? state.activeWatchlistId
              : lists[0]?.watchlist_id || null,
        });
      },
      setActiveWatchlist: (id) => set({ activeWatchlistId: id }),

      quotes: {},
      setQuote: (key, quote) =>
        set((s) => ({ quotes: { ...s.quotes, [key]: quote } })),
      setQuotes: (quotes) =>
        set((s) => ({ quotes: { ...s.quotes, ...quotes } })),

      driftReport: null,
      showDriftPanel: false,
      setDriftReport: (report) => set({ driftReport: report }),
      setShowDriftPanel: (show) => set({ showDriftPanel: show }),

      showSearchModal: false,
      showTokenSetup: false,
      showCreateWatchlistModal: false,
      mobileSidebarOpen: false,
      searchTargetWatchlistId: null,
      selectedStockItem: null,
      setSelectedStockItem: (item) => set({ selectedStockItem: item }),
      setShowSearchModal: (show, watchlistId) =>
        set({ showSearchModal: show, searchTargetWatchlistId: watchlistId || null }),
      setShowTokenSetup: (show) => set({ showTokenSetup: show }),
      setShowCreateWatchlistModal: (show) => set({ showCreateWatchlistModal: show }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      marketOpen: isMarketOpen(),
      setMarketOpen: (open) => set({ marketOpen: open }),
    }),
    {
      name: "market-watchlist-store",
      partialize: (state) => ({
        apiToken: state.apiToken,
        sessionId: state.sessionId,
        isDemoMode: state.isDemoMode,
        activeWatchlistId: state.activeWatchlistId,
      }),
    }
  )
);
