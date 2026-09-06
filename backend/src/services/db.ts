import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "../../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

interface DbSchema {
  watchlists: WatchlistRow[];
  watchlist_items: WatchlistItemRow[];
  snapshots: SnapshotRow[];
}

interface WatchlistRow {
  session_id: string;
  watchlist_id: string;
  watchlist_name: string;
  created_at: string;
}

interface WatchlistItemRow {
  id: number;
  session_id: string;
  watchlist_id: string;
  watchlist_name: string;
  exchange: string;
  segment: string;
  trading_symbol: string;
  groww_symbol: string;
  name: string;
  display_order: number;
  created_at: string;
}

interface SnapshotRow {
  session_id: string;
  exchange: string;
  trading_symbol: string;
  ltp: number;
  volume: number;
  day_change_perc: number;
  high_52w: number;
  low_52w: number;
  upper_circuit: number;
  lower_circuit: number;
  timestamp: number;
}

let _db: DbSchema = { watchlists: [], watchlist_items: [], snapshots: [] };
let _nextId = 1;
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

// Load from disk
function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      _db = {
        watchlists: parsed.watchlists || [],
        watchlist_items: parsed.watchlist_items || [],
        snapshots: parsed.snapshots || [],
      };
      _nextId = Math.max(..._db.watchlist_items.map(i => i.id), 0) + 1;
    }
  } catch {
    _db = { watchlists: [], watchlist_items: [], snapshots: [] };
  }
}

function save() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    fs.writeFileSync(DB_FILE, JSON.stringify(_db, null, 2), "utf-8");
  }, 100);
}

load();

const db = {
  getWatchlists(sessionId: string) {
    // Find all watchlists for session
    let lists = _db.watchlists.filter(w => w.session_id === sessionId);

    // If none exist in watchlists table, backfill from watchlist_items
    if (lists.length === 0) {
      const itemLists = new Map<string, { id: string; name: string; created_at: string }>();
      for (const item of _db.watchlist_items.filter(i => i.session_id === sessionId)) {
        if (!itemLists.has(item.watchlist_id)) {
          itemLists.set(item.watchlist_id, {
            id: item.watchlist_id,
            name: item.watchlist_name,
            created_at: item.created_at,
          });
        }
      }
      for (const [id, meta] of itemLists) {
        lists.push({
          session_id: sessionId,
          watchlist_id: id,
          watchlist_name: meta.name,
          created_at: meta.created_at,
        });
      }
      _db.watchlists.push(...lists);
      save();
    }

    return lists.map(w => {
      const items = _db.watchlist_items
        .filter(i => i.session_id === sessionId && i.watchlist_id === w.watchlist_id && i.trading_symbol !== "__PLACEHOLDER__")
        .sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at));
      return {
        watchlist_id: w.watchlist_id,
        watchlist_name: w.watchlist_name,
        created_at: w.created_at,
        items,
      };
    });
  },

  createWatchlist(sessionId: string, watchlistId: string, watchlistName: string) {
    const existing = _db.watchlists.find(w => w.session_id === sessionId && w.watchlist_id === watchlistId);
    if (!existing) {
      _db.watchlists.push({
        session_id: sessionId,
        watchlist_id: watchlistId,
        watchlist_name: watchlistName,
        created_at: new Date().toISOString(),
      });
      save();
    }
  },

  addWatchlistItem(row: Omit<WatchlistItemRow, "id" | "created_at">) {
    // Ensure parent watchlist exists
    const wl = _db.watchlists.find(w => w.session_id === row.session_id && w.watchlist_id === row.watchlist_id);
    if (!wl) {
      _db.watchlists.push({
        session_id: row.session_id,
        watchlist_id: row.watchlist_id,
        watchlist_name: row.watchlist_name,
        created_at: new Date().toISOString(),
      });
    }

    const existing = _db.watchlist_items.find(
      i => i.session_id === row.session_id && i.watchlist_id === row.watchlist_id &&
           i.exchange === row.exchange && i.trading_symbol === row.trading_symbol
    );
    if (existing) return;
    _db.watchlist_items.push({ ...row, id: _nextId++, created_at: new Date().toISOString() });
    save();
  },

  removeWatchlistItem(sessionId: string, watchlistId: string, exchange: string, symbol: string) {
    _db.watchlist_items = _db.watchlist_items.filter(
      i => !(i.session_id === sessionId && i.watchlist_id === watchlistId &&
             i.exchange === exchange && i.trading_symbol === symbol)
    );
    save();
  },

  deleteWatchlist(sessionId: string, watchlistId: string) {
    _db.watchlists = _db.watchlists.filter(
      w => !(w.session_id === sessionId && w.watchlist_id === watchlistId)
    );
    _db.watchlist_items = _db.watchlist_items.filter(
      i => !(i.session_id === sessionId && i.watchlist_id === watchlistId)
    );
    save();
  },

  renameWatchlist(sessionId: string, watchlistId: string, name: string) {
    const wl = _db.watchlists.find(w => w.session_id === sessionId && w.watchlist_id === watchlistId);
    if (wl) wl.watchlist_name = name;

    _db.watchlist_items.forEach(i => {
      if (i.session_id === sessionId && i.watchlist_id === watchlistId) i.watchlist_name = name;
    });
    save();
  },

  reorderItems(sessionId: string, watchlistId: string, order: Array<{ exchange: string; trading_symbol: string }>) {
    order.forEach((o, idx) => {
      const item = _db.watchlist_items.find(
        i => i.session_id === sessionId && i.watchlist_id === watchlistId &&
             i.exchange === o.exchange && i.trading_symbol === o.trading_symbol
      );
      if (item) item.display_order = idx;
    });
    save();
  },

  getAllSymbolsForSession(sessionId: string) {
    const seen = new Set<string>();
    return _db.watchlist_items.filter(i => {
      if (i.session_id !== sessionId || i.trading_symbol === "__PLACEHOLDER__") return false;
      const k = `${i.exchange}:${i.trading_symbol}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  },

  maxOrder(sessionId: string, watchlistId: string): number {
    const items = _db.watchlist_items.filter(i => i.session_id === sessionId && i.watchlist_id === watchlistId);
    return items.length === 0 ? 0 : Math.max(...items.map(i => i.display_order));
  },

  // Snapshots
  saveSnapshot(row: SnapshotRow) {
    const idx = _db.snapshots.findIndex(
      s => s.session_id === row.session_id && s.exchange === row.exchange && s.trading_symbol === row.trading_symbol
    );
    if (idx >= 0) _db.snapshots[idx] = row;
    else _db.snapshots.push(row);
    save();
  },

  getSnapshot(sessionId: string, exchange: string, symbol: string): SnapshotRow | null {
    return _db.snapshots.find(
      s => s.session_id === sessionId && s.exchange === exchange && s.trading_symbol === symbol
    ) || null;
  },

  getAllSnapshots(sessionId: string): SnapshotRow[] {
    return _db.snapshots.filter(s => s.session_id === sessionId);
  },
};

export default db;
