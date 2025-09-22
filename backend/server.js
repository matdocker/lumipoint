// server.js
// Express backend for Lumipoint with Redis persistence (Railway-ready)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

// Configuration
const PORT = Number(process.env.PORT || 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*"; // set to your vercel domain for stricter CORS
const REDIS_URL = process.env.REDIS_URL; // Railway Redis URL

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: false,
  })
);

// ---- Redis Setup ----
const redis = createClient({ url: REDIS_URL });
redis.on("error", (err) => console.error("Redis Client Error", err));
await redis.connect();

const STATE_KEY = "lumipoint:state";

// ---- Default state ----
const defaultState = {
  isNightLightMode: false,
  brightness: 120,     // 0..255
  offTimerMs: 5000,    // >= 0
  ledOn: false,
  lux: 12.3,
  adc: 87,
  motion: false,
  updatedAt: new Date().toISOString(),
};

// ---- State helpers ----
async function loadState() {
  const raw = await redis.get(STATE_KEY);
  return raw ? JSON.parse(raw) : { ...defaultState };
}

async function saveState(state) {
  await redis.set(STATE_KEY, JSON.stringify(state));
}

let state = await loadState();

// ---- Small helper: clamp numbers ----
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

// ---- Simulate telemetry drift ----
function tickTelemetry() {
  const drift = () => (Math.random() - 0.5) * 0.8;
  state.lux = Math.max(0, Number((state.lux + drift()).toFixed(2)));
  state.adc = Math.max(0, Math.round(state.adc + (Math.random() - 0.5) * 2));
  if (Math.random() < 0.05) state.motion = !state.motion; // flip sometimes
  state.updatedAt = new Date().toISOString();
}

// ---- Routes ----

// Health
app.get("/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Read full state
app.get("/state", async (_req, res) => {
  tickTelemetry();
  await saveState(state);
  res.json(state);
});

// Partial update: { isNightLightMode?, brightness?, offTimerMs? }
app.patch("/state", async (req, res) => {
  try {
    const { isNightLightMode, brightness, offTimerMs } = req.body || {};

    if (typeof isNightLightMode !== "undefined") {
      if (typeof isNightLightMode !== "boolean") {
        return res.status(400).json({ error: { code: "BAD_INPUT", message: "isNightLightMode must be boolean" } });
      }
      state.isNightLightMode = isNightLightMode;
    }

    if (typeof brightness !== "undefined") {
      const b = Number(brightness);
      if (!Number.isFinite(b)) {
        return res.status(400).json({ error: { code: "BAD_INPUT", message: "brightness must be a number" } });
      }
      state.brightness = clamp(Math.round(b), 0, 255);
    }

    if (typeof offTimerMs !== "undefined") {
      const t = Number(offTimerMs);
      if (!Number.isFinite(t) || t < 0) {
        return res.status(400).json({ error: { code: "BAD_INPUT", message: "offTimerMs must be >= 0" } });
      }
      state.offTimerMs = Math.round(t);
    }

    if (state.isNightLightMode) state.ledOn = true;

    state.updatedAt = new Date().toISOString();
    await saveState(state);
    return res.json(state);
  } catch (err) {
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: String(err?.message || err) } });
  }
});

// Immediate commands: { action: "LED_ON" | "LED_OFF" | "REBOOT" }
app.post("/command", async (req, res) => {
  try {
    const action = req.body?.action;
    if (!["LED_ON", "LED_OFF", "REBOOT"].includes(action)) {
      return res.status(400).json({
        error: { code: "BAD_INPUT", message: 'action must be "LED_ON" | "LED_OFF" | "REBOOT"' },
      });
    }

    if (action === "LED_ON") state.ledOn = true;
    if (action === "LED_OFF") state.ledOn = false;
    if (action === "REBOOT") {
      state.ledOn = false;
      state.motion = false;
      state.updatedAt = new Date().toISOString();
    }

    tickTelemetry();
    await saveState(state);
    return res.json({ ok: true, state });
  } catch (err) {
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: String(err?.message || err) } });
  }
});

// Root
app.get("/", (_req, res) => {
  res.type("text/plain").send(
    [
      "Lumipoint API (Express + Redis on Railway)",
      "GET    /health",
      "GET    /state",
      "PATCH  /state      { isNightLightMode?, brightness?, offTimerMs? }",
      'POST   /command    { action: "LED_ON"|"LED_OFF"|"REBOOT" }',
      "",
      "Uses Redis persistence (REDIS_URL env required).",
      "Set CORS_ORIGIN env (comma-separated) to restrict cross-origin access.",
    ].join("\n")
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Lumipoint API listening on http://0.0.0.0:${PORT}`);
});
