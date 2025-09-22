// server.js
// Express backend for Lumipoint with JSON file persistence + SSE (Railway-ready)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Configuration
const PORT = Number(process.env.PORT || 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*"; // set to your vercel domain for stricter CORS

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: false,
  })
);

// ---- Persistence Setup ----
const STATE_FILE = path.join(process.cwd(), "lumipoint-state.json");

// Default state
const defaultState = {
  isNightLightMode: false,
  brightness: 120, // 0..255
  offTimerMs: 5000, // >= 0
  ledOn: false,
  lux: 12.3,
  adc: 87,
  motion: false,
  updatedAt: new Date().toISOString(),
};

// Load state from file (or fallback to default)
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf8");
      console.log("[LOAD] State loaded from file:", raw);
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[LOAD] Failed to load state file:", err);
  }
  console.log("[LOAD] Using default state");
  return { ...defaultState };
}

// Save state to file
function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log("[SAVE] State persisted:", state);
  } catch (err) {
    console.error("[SAVE] Failed to save state file:", err);
  }
}

let state = loadState();

// ---- SSE Setup ----
let clients = [];

app.get("/events", (req, res) => {
  console.log("[SSE] Client connecting...");

  // Important: set headers manually for SSE + CORS
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN === "*" ? "*" : CORS_ORIGIN);

  res.flushHeaders();

  clients.push(res);
  console.log("[SSE] Client connected. Total:", clients.length);

  // Send initial state
  res.write(`data: ${JSON.stringify(state)}\n\n`);

  req.on("close", () => {
    console.log("[SSE] Client disconnected");
    clients = clients.filter((c) => c !== res);
  });
});

function broadcastState() {
  const data = JSON.stringify(state);
  console.log("[SSE] Broadcasting state to", clients.length, "clients:", data);
  clients.forEach((res) => res.write(`data: ${data}\n\n`));
}

// ---- Helpers ----
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

function tickTelemetry() {
  const drift = () => (Math.random() - 0.5) * 0.8;
  state.lux = Math.max(0, Number((state.lux + drift()).toFixed(2)));
  state.adc = Math.max(0, Math.round(state.adc + (Math.random() - 0.5) * 2));
  if (Math.random() < 0.05) state.motion = !state.motion;
  state.updatedAt = new Date().toISOString();
  saveState(state);
  console.log("[TELEMETRY] State updated:", state);
  broadcastState();
}

// ---- Routes ----
app.get("/health", (_req, res) => {
  console.log("[REQ] GET /health");
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/state", (_req, res) => {
  console.log("[REQ] GET /state");
  res.json(state); // no telemetry drift here anymore
});

app.patch("/state", (req, res) => {
  console.log("[REQ] PATCH /state with body:", req.body);
  try {
    const { isNightLightMode, brightness, offTimerMs } = req.body || {};

    if (typeof isNightLightMode !== "undefined") {
      if (typeof isNightLightMode !== "boolean") {
        console.warn("[PATCH] Invalid isNightLightMode:", isNightLightMode);
        return res.status(400).json({
          error: { code: "BAD_INPUT", message: "isNightLightMode must be boolean" },
        });
      }
      state.isNightLightMode = isNightLightMode;
    }

    if (typeof brightness !== "undefined") {
      const b = Number(brightness);
      if (!Number.isFinite(b)) {
        console.warn("[PATCH] Invalid brightness:", brightness);
        return res.status(400).json({
          error: { code: "BAD_INPUT", message: "brightness must be a number" },
        });
      }
      state.brightness = clamp(Math.round(b), 0, 255);
    }

    if (typeof offTimerMs !== "undefined") {
      const t = Number(offTimerMs);
      if (!Number.isFinite(t) || t < 0) {
        console.warn("[PATCH] Invalid offTimerMs:", offTimerMs);
        return res.status(400).json({
          error: { code: "BAD_INPUT", message: "offTimerMs must be >= 0" },
        });
      }
      state.offTimerMs = Math.round(t);
    }

    if (state.isNightLightMode) state.ledOn = true;

    state.updatedAt = new Date().toISOString();
    saveState(state);
    console.log("[PATCH] Updated state:", state);
    broadcastState();
    return res.json(state);
  } catch (err) {
    console.error("[PATCH] Server error:", err);
    return res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: String(err?.message || err) } });
  }
});

app.post("/command", (req, res) => {
  console.log("[REQ] POST /command with body:", req.body);
  try {
    const action = req.body?.action;
    if (!["LED_ON", "LED_OFF", "REBOOT"].includes(action)) {
      console.warn("[COMMAND] Invalid action:", action);
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
    console.log("[COMMAND] Executed action:", action, "-> state:", state);
    broadcastState();
    return res.json({ ok: true, state });
  } catch (err) {
    console.error("[COMMAND] Server error:", err);
    return res
      .status(500)
      .json({ error: { code: "SERVER_ERROR", message: String(err?.message || err) } });
  }
});

// Root
app.get("/", (_req, res) => {
  console.log("[REQ] GET /");
  res.type("text/plain").send(
    [
      "Lumipoint API (Express + JSON file persistence + SSE on Railway)",
      "GET    /health",
      "GET    /state",
      "PATCH  /state      { isNightLightMode?, brightness?, offTimerMs? }",
      'POST   /command    { action: "LED_ON"|"LED_OFF"|"REBOOT" }',
      "GET    /events     (SSE stream of live state)",
      "",
      "State is saved in lumipoint-state.json inside the container.",
      "Set CORS_ORIGIN env (comma-separated) to restrict cross-origin access.",
    ].join("\n")
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Lumipoint API listening on http://0.0.0.0:${PORT}`);
});
