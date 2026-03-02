const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function getRecipients() {
  return process.env.ALERT_RECIPIENTS.split(",").map((e) => e.trim());
}

function buildChargebackEmail(payload) {
  const cb = payload.Chargeback || {};
  const tx = payload.TransactionDetails || {};

  const subject = `⚠️ Chargeback Alert — $${cb.Amount || "?"} ${(cb.Currency || "").toUpperCase()} — Card ${tx.MaskedCardNumber || "N/A"}`;

  const html = `
    <h2>Chargeback Notification</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;">
      <tr><td style="padding:6px 12px;font-weight:bold;">Date</td><td style="padding:6px 12px;">${cb.Date || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Amount</td><td style="padding:6px 12px;">${cb.Amount || "N/A"} ${(cb.Currency || "").toUpperCase()}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Status</td><td style="padding:6px 12px;">${cb.Status || cb.StatusCategory || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Type</td><td style="padding:6px 12px;">${cb.Type || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Reason</td><td style="padding:6px 12px;">${cb.ChargebackReason || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Reason Message</td><td style="padding:6px 12px;">${cb.ReasonMessage || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Due Date</td><td style="padding:6px 12px;">${cb.DisputeDueDate || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Transaction ID</td><td style="padding:6px 12px;">${tx.TransactionId || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Client Unique ID</td><td style="padding:6px 12px;">${tx.ClientUniqueId || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Card</td><td style="padding:6px 12px;">${tx.MaskedCardNumber || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">ARN</td><td style="padding:6px 12px;">${tx.ARN || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Acquirer</td><td style="padding:6px 12px;">${tx.AcquirerName || "N/A"}</td></tr>
    </table>
    <br>
    <p style="font-family:sans-serif;color:#666;font-size:12px;">
      Event ID: ${payload.EventId || "N/A"} | Client: ${payload.ClientName || payload.ClientId || "N/A"}
    </p>
  `;

  return { subject, html };
}

function buildPreChargebackEmail(payload) {
  const alert = payload.Alert || {};

  const subject = `🔔 Pre-Chargeback Alert — $${alert.Amount || "?"} ${(alert.Currency || "").toUpperCase()} — Card ${alert.MaskedCreditCard || "N/A"}`;

  const html = `
    <h2>Pre-Chargeback Alert (Ethoca)</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;">
      <tr><td style="padding:6px 12px;font-weight:bold;">Alert Received</td><td style="padding:6px 12px;">${alert.AlertReceivedDate || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Amount</td><td style="padding:6px 12px;">${alert.Amount || "N/A"} ${(alert.Currency || "").toUpperCase()}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Alert Type</td><td style="padding:6px 12px;">${alert.AlertType || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Ethoca ID</td><td style="padding:6px 12px;">${alert.EthocaId || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Issuer</td><td style="padding:6px 12px;">${alert.Issuer || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Card</td><td style="padding:6px 12px;">${alert.MaskedCreditCard || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">ARN</td><td style="padding:6px 12px;">${alert.ARN || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Descriptor</td><td style="padding:6px 12px;">${alert.MerchantDescriptor || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Decision</td><td style="padding:6px 12px;">${alert.Decision || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Refunded</td><td style="padding:6px 12px;">${alert.Refunded != null ? alert.Refunded : "N/A"}</td></tr>
    </table>
    <br>
    <p style="font-family:sans-serif;color:#666;font-size:12px;">
      Event ID: ${payload.EventId || "N/A"} | Client: ${payload.ClientName || payload.ClientId || "N/A"}
    </p>
  `;

  return { subject, html };
}

function buildPreChargebackInquiryEmail(payload) {
  const cb = payload.Chargeback || {};
  const tx = payload.TransactionDetails || {};

  const subject = `📋 Pre-Chargeback Inquiry — $${cb.Amount || "?"} ${(cb.Currency || "").toUpperCase()} — Card ${tx.MaskedCardNumber || "N/A"}`;

  const html = `
    <h2>Pre-Chargeback Inquiry</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;">
      <tr><td style="padding:6px 12px;font-weight:bold;">Date</td><td style="padding:6px 12px;">${cb.Date || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Amount</td><td style="padding:6px 12px;">${cb.Amount || "N/A"} ${(cb.Currency || "").toUpperCase()}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Status</td><td style="padding:6px 12px;">${cb.Status || cb.StatusCategory || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Reason</td><td style="padding:6px 12px;">${cb.ChargebackReason || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Reason Message</td><td style="padding:6px 12px;">${cb.ReasonMessage || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Due Date</td><td style="padding:6px 12px;">${cb.DisputeDueDate || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Transaction ID</td><td style="padding:6px 12px;">${tx.TransactionId || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Client Unique ID</td><td style="padding:6px 12px;">${tx.ClientUniqueId || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Card</td><td style="padding:6px 12px;">${tx.MaskedCardNumber || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">ARN</td><td style="padding:6px 12px;">${tx.ARN || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Acquirer</td><td style="padding:6px 12px;">${tx.AcquirerName || "N/A"}</td></tr>
    </table>
    <br>
    <p style="font-family:sans-serif;color:#666;font-size:12px;">
      Event ID: ${payload.EventId || "N/A"} | Client: ${payload.ClientName || payload.ClientId || "N/A"}
    </p>
  `;

  return { subject, html };
}

function buildFraudEmail(payload) {
  const tx = payload.TransactionDetails || {};

  const subject = `🚨 Fraud Reported — $${tx.Amount || "?"} ${(tx.Currency || "").toUpperCase()} — Card ${tx.MaskedCardNumber || "N/A"}`;

  const html = `
    <h2>Fraud Reported Transaction</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;">
      <tr><td style="padding:6px 12px;font-weight:bold;">Transaction ID</td><td style="padding:6px 12px;">${tx.TransactionId || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Transaction Date</td><td style="padding:6px 12px;">${tx.TransactionDate || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Amount</td><td style="padding:6px 12px;">${tx.Amount || "N/A"} ${(tx.Currency || "").toUpperCase()}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Client Unique ID</td><td style="padding:6px 12px;">${tx.ClientUniqueId || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Card</td><td style="padding:6px 12px;">${tx.MaskedCardNumber || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">ARN</td><td style="padding:6px 12px;">${tx.ARN || "N/A"}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Acquirer</td><td style="padding:6px 12px;">${tx.AcquirerName || "N/A"}</td></tr>
    </table>
    <br>
    <p style="font-family:sans-serif;color:#666;font-size:12px;">
      Event ID: ${payload.EventId || "N/A"} | Client: ${payload.ClientName || payload.ClientId || "N/A"}
    </p>
  `;

  return { subject, html };
}

async function sendAlert(payload) {
  const eventType = payload.EventType || "";
  let email;

  if (eventType === "Chargeback") {
    email = buildChargebackEmail(payload);
  } else if (eventType === "Pre-Chargeback Alert") {
    email = buildPreChargebackEmail(payload);
  } else if (eventType === "Pre-Chargeback Inquiry") {
    email = buildPreChargebackInquiryEmail(payload);
  } else if (eventType === "Fraud Reported Transaction") {
    email = buildFraudEmail(payload);
  } else {
    email = {
      subject: `Nuvei Event: ${eventType}`,
      html: `<h2>${eventType}</h2><pre>${JSON.stringify(payload, null, 2)}</pre>`,
    };
  }

  const recipients = getRecipients();

  const msg = {
    to: recipients,
    from: process.env.SENDGRID_FROM,
    subject: email.subject,
    html: email.html,
  };

  await sgMail.send(msg);

  console.log(`Email sent to ${recipients.length} recipient(s) for event: ${eventType}`);
}

module.exports = { sendAlert };
