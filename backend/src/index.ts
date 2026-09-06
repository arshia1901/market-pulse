import app from "./app";

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(
      `🚀 Market Watchlist Backend running on http://localhost:${PORT}`
    );
    console.log(
      `📊 Demo mode: enabled (pass 'Authorization: Bearer YOUR_TOKEN' to use real Groww API)`
    );
  });
}