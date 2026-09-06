import { Router, Request, Response } from "express";
import { saveMultipleSnapshots, getAllSnapshots } from "../services/snapshotStore";
import { getBatchLTP } from "../services/growwClient";
import { computeDriftScore } from "../services/driftEngine";
import db from "../services/db";

const router = Router();

router.post("/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { snapshots } = req.body;
    if (!snapshots || !Array.isArray(snapshots)) return res.status(400).json({ status: "error", message: "snapshots array required" });
    saveMultipleSnapshots(sessionId, snapshots);
    res.json({ status: "success", message: `Saved ${snapshots.length} snapshots` });
  } catch (err: any) { res.status(500).json({ status: "error", message: err.message }); }
});

router.get("/:sessionId/drift", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const items = db.getAllSymbolsForSession(sessionId);
    if (items.length === 0) return res.json({ status: "success", data: [], hasSnapshot: false });
    const snapshots = getAllSnapshots(sessionId);
    if (snapshots.length === 0) return res.json({ status: "success", data: [], hasSnapshot: false });

    const snapshotMap = new Map(snapshots.map(s => [`${s.exchange}:${s.trading_symbol}`, s]));
    const currentQuotes = await getBatchLTP(
      items.map(i => ({ exchange: i.exchange, segment: i.segment, trading_symbol: i.trading_symbol })),
      token
    );

    const driftResults = items
      .map(item => {
        const key = `${item.exchange}:${item.trading_symbol}`;
        const snapshot = snapshotMap.get(key);
        const current = currentQuotes[key];
        if (!snapshot || !current) return null;
        return { ...computeDriftScore(item.trading_symbol, item.exchange, current, snapshot), name: item.name, currentQuote: current };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score);

    const lastSeenAt = Math.max(...snapshots.map(s => s.timestamp));
    res.json({ status: "success", data: driftResults, hasSnapshot: true, lastSeenAt });
  } catch (err: any) { res.status(500).json({ status: "error", message: err.message }); }
});

export default router;
