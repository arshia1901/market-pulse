import { Router, Request, Response } from "express";
import { searchInstruments, ensureInstruments } from "../services/instrumentCache";

const router = Router();

router.get("/search", async (req: Request, res: Response) => {
  try {
    await ensureInstruments();
    const q = (req.query.q as string) || "";
    const segment = (req.query.segment as string) || "";
    let results = searchInstruments(q, 30);
    if (segment) {
      results = results.filter((i) => i.segment === segment);
    }
    res.json({ status: "success", data: results });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;
