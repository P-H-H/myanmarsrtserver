import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/** Free Edge neural voices (no API key) */
const VOICES = {
  thiha: "my-MM-ThihaNeural",
  nilar: "my-MM-NilarNeural",
};

const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "TTS ခဏစောင့်ပါ" },
});

/** Optional Cloudflare Worker (primary). Fail → local msedge-tts. */
const WORKER_URL = (process.env.EDGE_TTS_WORKER_URL || "").replace(/\/$/, "");
const WORKER_KEY = process.env.EDGE_TTS_WORKER_KEY || "";
const WORKER_TIMEOUT_MS = Number(process.env.EDGE_TTS_WORKER_TIMEOUT_MS) || 20000;

/** Tiny in-memory cache (identical text+voice+speed). Lean, process-local. */
const CACHE_MAX = 80;
const CACHE_TTL_MS = 30 * 60 * 1000;
const memCache = new Map();

function cacheKey(voiceName, rate, text) {
  return crypto
    .createHash("sha256")
    .update(`${voiceName}|${rate}|${text}`)
    .digest("hex");
}

function cacheGet(key) {
  const row = memCache.get(key);
  if (!row) return null;
  if (Date.now() > row.exp) {
    memCache.delete(key);
    return null;
  }
  return row.buf;
}

function cacheSet(key, buf) {
  if (memCache.size >= CACHE_MAX) {
    const first = memCache.keys().next().value;
    if (first) memCache.delete(first);
  }
  memCache.set(key, { buf, exp: Date.now() + CACHE_TTL_MS });
}

function normalizeSpeed(raw) {
  let speed = Number(raw);
  if (!Number.isFinite(speed)) speed = 1.15;
  speed = Math.max(0.8, Math.min(1.5, speed));
  const ratePct = Math.round((speed - 1) * 100);
  const rate =
    ratePct === 0 ? "+0%" : ratePct > 0 ? `+${ratePct}%` : `${ratePct}%`;
  return { speed, rate };
}

/** Primary: Cloudflare Worker Edge TTS */
async function synthesizeViaWorker(text, voiceKey, speed) {
  if (!WORKER_URL) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS);

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(WORKER_KEY ? { Authorization: `Bearer ${WORKER_KEY}` } : {}),
      },
      body: JSON.stringify({ text, voice: voiceKey, speed }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Worker HTTP ${res.status} ${detail.slice(0, 120)}`);
    }

    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length < 100) throw new Error("Worker empty audio");
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

/** Fallback: local msedge-tts (same Edge voices) */
async function synthesizeViaLocal(text, voiceName, rate) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    voiceName,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
  );

  const { audioStream } = await tts.toStream(text, {
    rate,
    pitch: "+0Hz",
    volume: "+0%",
  });

  const chunks = [];
  await new Promise((resolve, reject) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    audioStream.on("data", (c) => chunks.push(Buffer.from(c)));
    audioStream.on("end", done);
    audioStream.on("close", done);
    audioStream.on("error", (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("TTS timeout"));
      }
    }, 60000);
  });

  const buf = Buffer.concat(chunks);
  if (!buf.length) throw new Error("Empty audio from Edge TTS");
  return buf;
}

/**
 * POST /api/tts
 * body: { text, voice?: "thiha"|"nilar", speed?: number }
 * returns: audio/mpeg
 *
 * Flow: memory cache → Cloudflare Worker (if configured) → local msedge-tts
 */
router.post("/", auth, ttsLimiter, async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "text required" });
    }
    if (text.length > 4000) {
      return res.status(400).json({ error: "text too long (max 4000 chars)" });
    }

    const voiceKey = String(req.body?.voice || "thiha").toLowerCase();
    const voiceName = VOICES[voiceKey] || VOICES.thiha;
    const { speed, rate } = normalizeSpeed(req.body?.speed);

    const key = cacheKey(voiceName, rate, text);
    const hit = cacheGet(key);
    if (hit) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", hit.length);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-TTS-Source", "cache");
      return res.send(hit);
    }

    let buf = null;
    let source = "local";

    // 1) Cloudflare Worker (primary)
    if (WORKER_URL) {
      try {
        buf = await synthesizeViaWorker(text, voiceKey, speed);
        source = "worker";
      } catch (e) {
        console.warn("[tts] worker failed → local:", e?.message || e);
      }
    }

    // 2) Local msedge-tts (fallback / default)
    if (!buf) {
      buf = await synthesizeViaLocal(text, voiceName, rate);
      source = "local";
    }

    cacheSet(key, buf);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buf.length);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-TTS-Source", source);
    return res.send(buf);
  } catch (e) {
    console.error("[tts]", e?.message || e);
    return res.status(502).json({
      error: e?.message || "TTS failed",
    });
  }
});

/** GET /api/tts/voices — list supported voices */
router.get("/voices", (_req, res) => {
  res.json({
    voices: [
      { id: "thiha", name: "Thiha", gender: "Male", edge: VOICES.thiha },
      { id: "nilar", name: "Nilar", gender: "Female", edge: VOICES.nilar },
    ],
    workerConfigured: Boolean(WORKER_URL),
  });
});

/** GET /api/tts/health — quick status (no auth) */
router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    workerConfigured: Boolean(WORKER_URL),
    cacheSize: memCache.size,
  });
});

export default router;
