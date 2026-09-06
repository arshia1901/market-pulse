# Market Pulse — Smart Market Watchlist

> Built for Groww Trade API Integration. Standalone full-stack smart market watchlist with live streaming, DriftScore™ intelligence, model portfolio aggregate analytics, and mobile responsiveness.

---

## Key Features

- **🔑 Real Groww Trade API Integration**: Live quote streaming via Groww's official batch LTP & quote endpoints with automatic fallback to realistic demo simulation.
- **⚡ DriftScore™ ("Since You Left") Intelligence**: Multi-factor signal engine detecting meaningful price breakouts, volume anomalies, 52-week breaches, and circuit limit events since return.
- **🧺 Model Portfolio & Watchlist Aggregate Summary Dock**:
  - Live aggregate basket return (%)
  - Market breadth counter (Advances / Declines)
  - Interactive **Top Gainer** & **Top Loser** chips
  - Aggregated traded turnover and volume
- **📱 Responsive Layout**:
  - Zero right-edge cutoffs across mobile viewports (360px–414px)
  - Dedicated mobile index strip & horizontal scrollable watchlist pills
  - Mobile drawer sidebar
- **🔍 Fast Search**: Search and filter from thousands of official NSE/BSE cash equities.
- **📊 Interactive Stock Inspection Modal**: Click any stock to view detailed OHLC, day's range slider, 52-week range slider, circuits, and bezier sparkline with pinned header and footer.

---

## DriftScore Formula

| Signal | Weight | Threshold |
|---|---|---|
| Price % change since last seen | 40% | >±0.8% |
| Volume spike vs baseline | 25% | >1.5x |
| 52W high/low proximity | 20% | within 0.2% |
| Circuit breaker proximity | 10% | within 2% |
| Intraday range volatility | 5% | >1.5% |

---

## Running Locally

### 1. Install Dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start Backend Server
```bash
cd backend && npm run dev
# Backend runs on http://localhost:4000
```

### 3. Start Frontend App
```bash
cd frontend && npm run dev
# Frontend runs on http://localhost:5173
```

---

## API Modes

- **🔑 Live API Mode**: Connect your Groww Trade API Bearer Token directly from the top bar to stream genuine live NSE market quotes.
- **🎭 Demo Simulation Mode**: Offline simulation generating realistic random walks, volume surges, and circuit events.
