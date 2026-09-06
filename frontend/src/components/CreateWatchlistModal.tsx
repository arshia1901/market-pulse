import { useState } from "react";
import { useStore } from "../store/watchlistStore";
import { api } from "../store/api";

interface Props {
  onCreated: () => void;
}

export default function CreateWatchlistModal({ onCreated }: Props) {
  const { showCreateWatchlistModal, setShowCreateWatchlistModal, sessionId, setActiveWatchlist, setShowSearchModal } = useStore();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!showCreateWatchlistModal) return null;

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a watchlist name");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await api.createWatchlist(sessionId, trimmed);
      setName("");
      setShowCreateWatchlistModal(false);
      onCreated();
      if (res?.watchlist_id) {
        setActiveWatchlist(res.watchlist_id);
        // Automatically open search modal so user can immediately add stocks!
        setTimeout(() => setShowSearchModal(true, res.watchlist_id), 150);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create watchlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateWatchlistModal(false); }}>
      <div className="token-modal" style={{ maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>✨ New Watchlist</h2>
          <button className="drift-panel-close" onClick={() => setShowCreateWatchlistModal(false)}>×</button>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.4 }}>
          Give your watchlist a name to organize your stocks, indices, or sectors.
        </p>

        <input
          className="token-input"
          placeholder="e.g. IT Giants, High Growth, Swing Trades..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
          autoFocus
        />

        {error && (
          <div style={{ marginTop: 10, color: "var(--red)", fontSize: 12 }}>
            ⚠️ {error}
          </div>
        )}

        <div className="token-actions" style={{ marginTop: 16 }}>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Watchlist"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => setShowCreateWatchlistModal(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
