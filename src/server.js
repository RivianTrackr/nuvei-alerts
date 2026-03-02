require("dotenv").config();

const express = require("express");
const { verifyChecksum } = require("./checksum");
const { sendAlert } = require("./email");

const app = express();
const PORT = process.env.PORT || 3200;

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
      return res.status(401).json({ error: "Invalid checksum" });
    }
  }

  // Only process chargeback and dispute events
  const alertTypes = ["Chargeback", "Pre-Chargeback Alert"];
  if (!alertTypes.includes(eventType)) {
    console.log(`Ignoring event type: ${eventType}`);
    return res.json({ received: true, processed: false, reason: "Event type not monitored" });
  }

  // Respond to Nuvei immediately so they don't retry
  res.json({ received: true, processed: true });

  // Send email asynchronously (after responding)
  try {
    await sendAlert(payload);
  } catch (err) {
    console.error(`Failed to send email for event ${eventId}:`, err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Nuvei alert server listening on port ${PORT}`);
  console.log(`Webhook URL: POST /webhook/nuvei`);
  console.log(`Recipients: ${process.env.ALERT_RECIPIENTS || "NOT SET"}`);
});
