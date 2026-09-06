import { Router, Request, Response } from "express";
import db from "../services/db";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.get("/:sessionId", (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const result = db.getWatchlists(sessionId);
    if (result.length === 0) {
      const defaultId = uuidv4();
      res.json({ status: "success", data: [{ watchlist_id: defaultId, watchlist_name: "My Watchlist", created_at: new Date().toISOString(), items: [] }] });
      return;
    }
    res.json({ status: "success", data: result });
  } catch (err: any) { res.status(500).json({ status: "error", message: err.message }); }
});

router.post("/:sessionId/lists", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { name } = req.body;
  const watchlistId = uuidv4();
  const watchlistName = (name && name.trim()) || "New Watchlist";
  db.createWatchlist(sessionId, watchlistId, watchlistName);
  res.json({ status: "success", data: { watchlist_id: watchlistId, watchlist_name: watchlistName, created_at: new Date().toISOString(), items: [] } });
});

router.post("/:sessionId/:watchlistId", (req: Request, res: Response) => {
  try {
    const { sessionId, watchlistId } = req.params;
    const { exchange, segment, trading_symbol, groww_symbol, name, watchlist_name } = req.body;
    if (!exchange || !trading_symbol) return res.status(400).json({ status: "error", message: "exchange and trading_symbol required" });
    const maxOrder = db.maxOrder(sessionId, watchlistId);
    db.addWatchlistItem({
      session_id: sessionId, watchlist_id: watchlistId,
      watchlist_name: watchlist_name || "My Watchlist",
      exchange, segment: segment || "CASH", trading_symbol,
      groww_symbol: groww_symbol || trading_symbol, name: name || trading_symbol,
      display_order: maxOrder + 1,
    });
    res.json({ status: "success", message: "Added" });
  } catch (err: any) { res.status(500).json({ status: "error", message: err.message }); }
});

router.delete("/:sessionId/:watchlistId/:exchange/:symbol", (req: Request, res: Response) => {
  try {
    const { sessionId, watchlistId, exchange, symbol } = req.params;
    db.removeWatchlistItem(sessionId, watchlistId, exchange, symbol);
    res.json({ status: "success", message: "Removed" });
  } catch (err: any) { res.status(500).json({ status: "error", message: err.message }); }
});

router.put("/:sessionId/:watchlistId/reorder", (req: Request, res: Response) => {
  try {
    const { sessionId, watchlistId } = req.params;
    const { order } = req.body as { order: Array<{ exchange: string; trading_symbol: string }> };
    db.reorderItems(sessionId, watchlistId, order);
    res.json({ status: "success" });
  } catch (err: any) { res.status(500).json({ status: "error", message: err.message }); }
});

router.put("/:sessionId/:watchlistId/rename", (req: Request, res: Response) => {
  try {
    const { sessionId, watchlistId } = req.params;
    const { name } = req.body;
    db.renameWatchlist(sessionId, watchlistId, name);
    res.json({ status: "success" });
  } catch (err: any) { res.status(500).json({ status: "error", message: err.message }); }
});

router.delete("/:sessionId/:watchlistId", (req: Request, res: Response) => {
  try {
    const { sessionId, watchlistId } = req.params;
    db.deleteWatchlist(sessionId, watchlistId);
    res.json({ status: "success" });
  } catch (err: any) { res.status(500).json({ status: "error", message: err.message }); }
});

export default router;
