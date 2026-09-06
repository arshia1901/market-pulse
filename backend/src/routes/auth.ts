import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

// Endpoint to exchange Groww API Key + API Secret + TOTP for Access Token
router.post("/groww-login", async (req: Request, res: Response) => {
  const { apiKey, apiSecret, totp } = req.body;

  if (!apiKey || !apiSecret) {
    return res.status(400).json({
      status: "error",
      message: "API Key and API Secret are required",
    });
  }

  try {
    // Attempt exchange with Groww Trade API auth endpoint
    const response = await axios.post(
      "https://api.groww.in/v1/auth/token",
      {
        api_key: apiKey,
        api_secret: apiSecret,
        totp: totp || undefined,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-VERSION": "1.0",
        },
        timeout: 10000,
      }
    );

    const accessToken =
      response.data?.access_token ||
      response.data?.token ||
      response.data?.payload?.access_token;

    if (!accessToken) {
      return res.status(400).json({
        status: "error",
        message: "Failed to retrieve access token from Groww response",
        raw: response.data,
      });
    }

    return res.json({
      status: "success",
      accessToken,
      expiresIn: response.data?.expires_in || 86400,
    });
  } catch (err: any) {
    console.error("[Auth] Groww login error:", err?.response?.data || err.message);
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err.message ||
      "Failed to authenticate with Groww API";

    return res.status(err?.response?.status || 500).json({
      status: "error",
      message,
    });
  }
});

// Endpoint to validate if an existing token is valid
router.post("/validate-token", async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ status: "error", message: "Token is required" });
  }

  if (token === "demo") {
    return res.json({ status: "success", valid: true, mode: "demo" });
  }

  try {
    // Test token with a sample Quote call to Groww
    const testResp = await axios.get("https://api.groww.in/v1/live-data/quote", {
      params: { exchange: "NSE", segment: "CASH", trading_symbol: "RELIANCE" },
      headers: {
        Authorization: `Bearer ${token}`,
        "X-API-VERSION": "1.0",
        Accept: "application/json",
      },
      timeout: 6000,
    });

    if (testResp.status === 200 && testResp.data?.status === "SUCCESS") {
      return res.json({ status: "success", valid: true, mode: "real" });
    }
    return res.status(400).json({ status: "error", valid: false, message: testResp.data?.error?.message || "Token validation failed" });
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || "Invalid or expired token";
    return res.status(err?.response?.status || 401).json({
      status: "error",
      valid: false,
      message: msg,
    });
  }
});

export default router;
