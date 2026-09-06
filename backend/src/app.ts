import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRouter from "./routes/auth";
import instrumentsRouter from "./routes/instruments";
import liveDataRouter from "./routes/liveData";
import watchlistRouter from "./routes/watchlist";
import snapshotRouter from "./routes/snapshot";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:4173",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mode: "demo",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/instruments", instrumentsRouter);
app.use("/api/live", liveDataRouter);
app.use("/api/watchlist", watchlistRouter);
app.use("/api/snapshot", snapshotRouter);

export default app;