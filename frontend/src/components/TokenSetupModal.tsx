import { useState, useEffect } from "react";
import { useStore } from "../store/watchlistStore";
import { api } from "../store/api";

export default function TokenSetupModal() {
  const { showTokenSetup, setShowTokenSetup, apiToken, setApiToken, isDemoMode } = useStore();
  const [tab, setTab] = useState<"token" | "credentials">("token");
  const [tokenInput, setTokenInput] = useState("");
  
  // Credentials tab state
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [totp, setTotp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (showTokenSetup) {
      setTokenInput(apiToken || "");
      setErrorMsg("");
      setSuccessMsg("");
      setLoading(false);
    }
  }, [showTokenSetup, apiToken]);

  if (!showTokenSetup) return null;

  const handleSaveToken = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setApiToken("");
      setSuccessMsg("Switched to Demo Mode");
      setTimeout(() => setShowTokenSetup(false), 500);
      return;
    }

    setLoading(true);
    try {
      const res = await api.validateToken(trimmed);
      if (res && res.valid) {
        setApiToken(trimmed);
        setSuccessMsg("✓ Token validated! Connected to Groww Trade API.");
        setTimeout(() => setShowTokenSetup(false), 800);
      } else {
        setErrorMsg(res?.message || "Invalid or expired Groww Token. Please check your token.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Token validation failed. Please check token or network.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsLogin = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!apiKey.trim() || !apiSecret.trim()) {
      setErrorMsg("Please enter both API Key and API Secret");
      return;
    }

    setLoading(true);
    try {
      const res = await api.growwLogin(apiKey.trim(), apiSecret.trim(), totp.trim() || undefined);
      if (res && res.accessToken) {
        setApiToken(res.accessToken);
        setSuccessMsg("✓ Session established! Connected to Groww Trade API.");
        setTimeout(() => setShowTokenSetup(false), 800);
      } else {
        setErrorMsg("Failed to obtain session token from Groww API.");
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setApiToken("");
    setTokenInput("");
    setSuccessMsg("Switched to Demo Mode");
    setTimeout(() => setShowTokenSetup(false), 500);
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowTokenSetup(false); }}>
      <div className="token-modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>🔑 Groww API Connection</h2>
          <button className="drift-panel-close" onClick={() => setShowTokenSetup(false)}>×</button>
        </div>

        {/* Current status banner */}
        <div style={{
          marginBottom: 16,
          padding: "8px 12px",
          borderRadius: 8,
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: isDemoMode ? "rgba(249, 115, 22, 0.1)" : "rgba(34, 197, 94, 0.1)",
          border: `1px solid ${isDemoMode ? "rgba(249, 115, 22, 0.25)" : "rgba(34, 197, 94, 0.25)"}`,
          color: isDemoMode ? "#fb923c" : "var(--green)"
        }}>
          <span>Current: <strong>{isDemoMode ? "🎭 Demo Simulation Mode" : "🔑 Live Groww API"}</strong></span>
          {!isDemoMode && (
            <button
              onClick={handleDisconnect}
              style={{ background: "none", border: "none", color: "var(--red)", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Tab switch */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 8 }}>
          <button
            onClick={() => { setTab("token"); setErrorMsg(""); }}
            style={{
              background: tab === "token" ? "rgba(255,255,255,0.1)" : "transparent",
              color: tab === "token" ? "#fff" : "var(--text-secondary)",
              border: "none",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Bearer Token
          </button>
          <button
            onClick={() => { setTab("credentials"); setErrorMsg(""); }}
            style={{
              background: tab === "credentials" ? "rgba(255,255,255,0.1)" : "transparent",
              color: tab === "credentials" ? "#fff" : "var(--text-secondary)",
              border: "none",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            API Key & Secret
          </button>
        </div>

        {tab === "token" ? (
          <div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.5 }}>
              Paste your Groww Trading API Bearer token. We will test and validate it against the live Groww API before connecting.
            </p>
            <input
              className="token-input"
              type="password"
              placeholder="Paste Bearer token (eyJhbGci...)"
              value={tokenInput}
              onChange={e => { setTokenInput(e.target.value); setErrorMsg(""); }}
              onKeyDown={e => e.key === "Enter" && handleSaveToken()}
            />
            <div className="token-actions" style={{ marginTop: 14 }}>
              <button className="btn-primary" onClick={handleSaveToken} disabled={loading}>
                {loading ? "Validating with Groww..." : "Validate & Connect"}
              </button>
              <button className="btn-secondary" onClick={handleDisconnect}>
                Use Demo Mode
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.5 }}>
              Enter your Groww developer credentials to generate an automated authenticated session.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <input
                className="token-input"
                type="text"
                placeholder="Groww API Key"
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setErrorMsg(""); }}
              />
              <input
                className="token-input"
                type="password"
                placeholder="Groww API Secret"
                value={apiSecret}
                onChange={e => { setApiSecret(e.target.value); setErrorMsg(""); }}
              />
              <input
                className="token-input"
                type="text"
                placeholder="TOTP / Authenticator Code (Optional)"
                value={totp}
                onChange={e => { setTotp(e.target.value); setErrorMsg(""); }}
              />
            </div>
            <div className="token-actions">
              <button className="btn-primary" onClick={handleCredentialsLogin} disabled={loading}>
                {loading ? "Authenticating with Groww..." : "Generate Session"}
              </button>
              <button className="btn-secondary" onClick={handleDisconnect}>
                Use Demo Mode
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ marginTop: 14, padding: "9px 12px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid var(--red)", borderRadius: 8, color: "#f87171", fontSize: 12 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ marginTop: 14, padding: "9px 12px", background: "rgba(34, 197, 94, 0.12)", border: "1px solid var(--green)", borderRadius: 8, color: "var(--green)", fontSize: 12 }}>
            {successMsg}
          </div>
        )}

        <div className="demo-note" style={{ marginTop: 14 }}>
          ⚡ In <strong>Demo Mode</strong>, the app generates realistic simulated live ticks, volume spikes, and random walks.
        </div>
      </div>
    </div>
  );
}
