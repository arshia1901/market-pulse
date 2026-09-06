import { useStore } from "../store/watchlistStore";

interface Props {
  onRefresh: () => void;
}

export default function Sidebar({ onRefresh }: Props) {
  const {
    watchlists,
    activeWatchlistId,
    setActiveWatchlist,
    setShowCreateWatchlistModal,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useStore();

  const handleSelect = (id: string) => {
    setActiveWatchlist(id);
    setMobileSidebarOpen(false);
  };

  const handleOpenCreate = () => {
    setShowCreateWatchlistModal(true);
    setMobileSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className={`sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">Watchlists</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={handleOpenCreate}
              title="Create New Watchlist"
              className="sidebar-add-icon-btn"
            >
              +
            </button>
            {mobileSidebarOpen && (
              <button
                className="mobile-sidebar-close"
                onClick={() => setMobileSidebarOpen(false)}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="watchlist-list">
          {watchlists.map(wl => (
            <button
              key={wl.watchlist_id}
              className={`watchlist-tab ${activeWatchlistId === wl.watchlist_id ? "active" : ""}`}
              onClick={() => handleSelect(wl.watchlist_id)}
            >
              <span className="wl-tab-name">{wl.watchlist_name}</span>
              <span className="count">{wl.items.length}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="add-watchlist-btn" onClick={handleOpenCreate}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Watchlist
          </button>
        </div>
      </div>
    </>
  );
}
