import axios from "axios";
import { Watchlist, QuoteData, DriftReport, Instrument } from "../types";

const API = "/api";

function getAuthHeader(token: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Watchlist
  async getWatchlists(sessionId: string): Promise<Watchlist[]> {
    const r = await axios.get(`${API}/watchlist/${sessionId}`);
    return r.data.data;
  },

  async createWatchlist(sessionId: string, name: string): Promise<Watchlist> {
    const r = await axios.post(`${API}/watchlist/${sessionId}/lists`, { name });
    return r.data.data;
  },

  async addToWatchlist(
    sessionId: string,
    watchlistId: string,
    item: {
      exchange: string; segment: string; trading_symbol: string;
      groww_symbol: string; name: string; watchlist_name: string;
    }
  ) {
    await axios.post(`${API}/watchlist/${sessionId}/${watchlistId}`, item);
  },

  async removeFromWatchlist(
    sessionId: string, watchlistId: string, exchange: string, symbol: string
  ) {
    await axios.delete(`${API}/watchlist/${sessionId}/${watchlistId}/${exchange}/${symbol}`);
  },

  async renameWatchlist(sessionId: string, watchlistId: string, name: string) {
    await axios.put(`${API}/watchlist/${sessionId}/${watchlistId}/rename`, { name });
  },

  async deleteWatchlist(sessionId: string, watchlistId: string) {
    await axios.delete(`${API}/watchlist/${sessionId}/${watchlistId}`);
  },

  // Live Data
  async getBatchLTP(
    items: Array<{ exchange: string; segment: string; trading_symbol: string }>,
    token: string
  ): Promise<Record<string, QuoteData>> {
    const r = await axios.post(`${API}/live/batch`, { items }, { headers: getAuthHeader(token) });
    return r.data.data;
  },

  async getIndices(token: string): Promise<Record<string, QuoteData>> {
    const r = await axios.get(`${API}/live/indices`, { headers: getAuthHeader(token) });
    return r.data.data;
  },

  // Instruments
  async searchInstruments(query: string, segment?: string): Promise<Instrument[]> {
    const r = await axios.get(`${API}/instruments/search`, {
      params: { q: query, segment },
    });
    return r.data.data;
  },

  // Snapshots
  async saveSnapshots(
    sessionId: string,
    snapshots: Array<{ exchange: string; trading_symbol: string; quote: QuoteData }>
  ) {
    await axios.post(`${API}/snapshot/${sessionId}`, { snapshots });
  },

  async getDriftReport(sessionId: string, token: string): Promise<DriftReport> {
    const r = await axios.get(`${API}/snapshot/${sessionId}/drift`, {
      headers: getAuthHeader(token),
    });
    return r.data;
  },

  // Auth
  async growwLogin(apiKey: string, apiSecret: string, totp?: string): Promise<{ accessToken: string }> {
    const r = await axios.post(`${API}/auth/groww-login`, { apiKey, apiSecret, totp });
    return r.data;
  },

  async validateToken(token: string): Promise<{ valid: boolean; mode?: string; message?: string }> {
    const r = await axios.post(`${API}/auth/validate-token`, { token });
    return r.data;
  },
};
