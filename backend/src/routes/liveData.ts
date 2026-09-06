import { Router, Request, Response } from "express";
import { getLTP, getQuote, getBatchLTP } from "../services/growwClient";

const router = Router();

// Get full quote for a single instrument
router.get("/quote/:exchange/:segment/:symbol", async (req: Request, res: Response) => {
  try {
    const { exchange, segment, symbol } = req.params;
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const quote = await getQuote(exchange, segment, symbol, token);
    res.json({ status: "success", data: quote });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Batch LTP for all watchlist items
router.post("/batch", async (req: Request, res: Response) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { items } = req.body as {
      items: Array<{ exchange: string; segment: string; trading_symbol: string }>;
    };
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ status: "error", message: "items array required" });
    }
    const quotes = await getBatchLTP(items, token);
    res.json({ status: "success", data: quotes });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Market indices (Nifty, Sensex)
router.get("/indices", async (req: Request, res: Response) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const indices = [
      { exchange: "NSE", segment: "CASH", trading_symbol: "NIFTY" },
      { exchange: "NSE", segment: "CASH", trading_symbol: "BANKNIFTY" },
      { exchange: "BSE", segment: "CASH", trading_symbol: "SENSEX" },
    ];
    const quotes = await getBatchLTP(indices, token);
    res.json({ status: "success", data: quotes });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
