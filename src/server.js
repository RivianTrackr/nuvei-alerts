require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const { verifyChecksum } = require("./checksum");
const { sendAlert } = require("./email");

const app = express();
const PORT = process.env.PORT || 3200;

// --- Duplicate protection ---
// Cache processed EventIds in memory (auto-expires after 24h)
const processedEvents = new Map();
const DEDUP_TTL = 24 * 60 * 60 * 1000; // 24 hours

function isDuplicate(eventId) {
  if (!eventId) return false;
  if (processedEvents.has(eventId)) return true;
  processedEvents.set(eventId, Date.now());
  return false;
}

// Clean expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, timestamp] of processedEvents) {
    if (now - timestamp > DEDUP_TTL) processedEvents.delete(id);
  }
}, 60 * 60 * 1000);

// --- File logging ---
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, "..", "logs");
const LOG_RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS) || 30;
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// Delete log files older than LOG_RETENTION_DAYS
function cleanOldLogs() {
  const cutoff = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  try {
    for (const file of fs.readdirSync(LOG_DIR)) {
      if (!file.startsWith("events-") || !file.endsWith(".log")) continue;
      const filePath = path.join(LOG_DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old log: ${file}`);
      }
    }
  } catch (err) {
    console.error("Log cleanup failed:", err.message);
  }
}

// Run cleanup on startup and daily
cleanOldLogs();
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);

function logEvent(payload, status) {
  const timestamp = new Date().toISOString();
  const eventType = payload.EventType || "unknown";
  const eventId = payload.EventId || "N/A";

  const entry = JSON.stringify({ timestamp, eventId, eventType, status, payload }) + "\n";

  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const logFile = path.join(LOG_DIR, `events-${dateStr}.log`);

  fs.appendFile(logFile, entry, (err) => {
    if (err) console.error("Failed to write log:", err.message);
  });
}

// Nuvei sends JSON payloads
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Nuvei webhook endpoint
app.post("/webhook/nuvei", async (req, res) => {
  const payload = req.body;
  const eventType = payload.EventType || "unknown";
  const eventId = payload.EventId || "N/A";

  console.log(`Received event: ${eventType} (ID: ${eventId})`);

  // Checksum verification (optional but recommended)
  const merchantSecret = process.env.NUVEI_MERCHANT_SECRET;
  if (merchantSecret) {
    const checksum = req.headers["checksum"] || req.headers["Checksum"];
    if (checksum && !verifyChecksum(payload, checksum, merchantSecret)) {
      console.warn(`Checksum mismatch for event ${eventId} — rejecting`);
      logEvent(payload, "rejected-checksum");
      return res.status(401).json({ error: "Invalid checksum" });
    }
  }

  // Only process chargeback, pre-chargeback, and fraud events
  const alertTypes = ["Chargeback", "Pre-Chargeback Alert", "Pre-Chargeback Inquiry"];
  if (!alertTypes.includes(eventType)) {
    console.log(`Ignoring event type: ${eventType}`);
    logEvent(payload, "ignored");
    return res.json({ received: true, processed: false, reason: "Event type not monitored" });
  }

  // Duplicate protection
  if (isDuplicate(eventId)) {
    console.log(`Duplicate event ${eventId} — skipping`);
    logEvent(payload, "duplicate");
    return res.json({ received: true, processed: false, reason: "Duplicate event" });
  }

  // Respond to Nuvei immediately so they don't retry
  res.json({ received: true, processed: true });

  // Send email asynchronously (after responding)
  try {
    await sendAlert(payload);
    logEvent(payload, "emailed");
  } catch (err) {
    console.error(`Failed to send email for event ${eventId}:`, err.message);
    logEvent(payload, "email-failed");
  }
});

app.listen(PORT, () => {
  console.log(`Nuvei alert server listening on port ${PORT}`);
  console.log(`Webhook URL: POST /webhook/nuvei`);
  console.log(`Recipients: ${process.env.ALERT_RECIPIENTS || "NOT SET"}`);
  console.log(`Log directory: ${LOG_DIR}`);
});
