# Nuvei Chargeback & Dispute Alert Service

Webhook listener that receives Nuvei DMN (Direct Merchant Notification) events and sends email alerts via SendGrid when a chargeback, pre-chargeback, or fraud event is created or updated.

## How It Works

1. Nuvei sends a POST request to `https://your-domain.com/webhook/nuvei`
2. The server validates the checksum (if configured) and checks the event type
3. Duplicate events are detected by `EventId` and skipped (24h window)
4. If the event is a **Chargeback**, **Pre-Chargeback Alert**, **Pre-Chargeback Inquiry**, or **Fraud Reported Transaction**, an email is sent to all recipients
5. All events are logged to daily log files in the `logs/` directory
6. All other event types are ignored

## Server Info

- **Host:** Linode (Debian 13) — `YOUR_SERVER_IP`
- **URL:** `https://your-domain.com`
- **Webhook endpoint:** `POST /webhook/nuvei`
- **Health check:** `GET /health`
- **Port:** 3200 (behind Nginx reverse proxy)

## Project Structure

```
nuvei-alerts/
├── .env.example            # Config template
├── .gitignore
├── package.json
├── nuvei-alerts.service     # systemd service file
├── README.md
├── logs/                    # Daily event log files (auto-created)
│   └── events-YYYY-MM-DD.log
└── src/
    ├── server.js            # Express webhook endpoint
    ├── checksum.js          # Nuvei SHA-256 checksum validation
    └── email.js             # SendGrid email builder + sender
```

## Configuration (.env)

The `.env` file on the server (`~/nuvei-alerts/.env`) contains all configuration:

```
PORT=3200
NUVEI_MERCHANT_SECRET=your_merchant_secret_key
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM="Nuvei Alerts <alerts@yourdomain.com>"
ALERT_RECIPIENTS=person1@example.com,person2@example.com
```

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3200) |
| `NUVEI_MERCHANT_SECRET` | Nuvei merchant secret key for checksum validation |
| `SENDGRID_API_KEY` | SendGrid API key (starts with `SG.`) |
| `SENDGRID_FROM` | Sender email — must be a verified sender in SendGrid |
| `ALERT_RECIPIENTS` | Comma-separated list of email addresses to receive alerts |

## Common Tasks

### SSH into the server

```bash
ssh root@YOUR_SERVER_IP
```

### Update email recipients

```bash
ssh root@YOUR_SERVER_IP
nano ~/nuvei-alerts/.env
# Edit the ALERT_RECIPIENTS line
systemctl restart nuvei-alerts
```

### Deploy code changes

After pushing changes to GitHub:

```bash
ssh root@YOUR_SERVER_IP
cd ~/nuvei-alerts
git pull
npm install
systemctl restart nuvei-alerts
```

### Check if the service is running

```bash
systemctl status nuvei-alerts
```

### View logs

```bash
# Live service logs
journalctl -u nuvei-alerts -f

# Last 50 service log lines
journalctl -u nuvei-alerts -n 50

# View today's event log file
cat ~/nuvei-alerts/logs/events-$(date +%Y-%m-%d).log

# View a specific date
cat ~/nuvei-alerts/logs/events-2026-03-02.log
```

### Restart the service

```bash
systemctl restart nuvei-alerts
```

### Check health

```bash
curl https://your-domain.com/health
```

## Testing

### Test chargeback alert

```bash
curl -X POST https://your-domain.com/webhook/nuvei \
  -H "Content-Type: application/json" \
  -d '{
    "EventId": "test-001",
    "EventType": "Chargeback",
    "ClientId": 12345,
    "ClientName": "Test Merchant",
    "Chargeback": {
      "Date": "2026-03-02 10:00:00",
      "StatusCategory": "Regular",
      "Type": "Chargeback",
      "Amount": 49.99,
      "Currency": "USD",
      "ChargebackReason": "10.4 - Other Fraud-Card Absent Environment"
    },
    "TransactionDetails": {
      "TransactionId": 123456789,
      "MaskedCardNumber": "4***********1234",
      "ARN": "05295314304000000000456"
    }
  }'
```

### Test pre-chargeback alert

```bash
curl -X POST https://your-domain.com/webhook/nuvei \
  -H "Content-Type: application/json" \
  -d '{
    "EventId": "test-002",
    "EventType": "Pre-Chargeback Alert",
    "ClientId": 12345,
    "ClientName": "Test Merchant",
    "Alert": {
      "AlertReceivedDate": "2026-03-02T10:00:00.000",
      "EthocaId": "testAlert123",
      "AlertType": "issuer_alert",
      "Issuer": "Bank of America",
      "MaskedCreditCard": "4***********5678",
      "ARN": "64738272371643523456435",
      "Amount": 25.00,
      "Currency": "USD"
    }
  }'
```

All should return `{"received":true,"processed":true}` and trigger emails.

**Note:** Duplicate protection is active — sending the same `EventId` twice within 24 hours will return `"reason":"Duplicate event"` and skip the email.

## Nuvei Control Panel Setup

1. Log into the Nuvei Control Panel
2. Go to **Settings > Notifications / DMN**
3. Set webhook URL to: `https://your-domain.com/webhook/nuvei`
4. Enable **Chargeback**, **Pre-Chargeback Alert**, **Pre-Chargeback Inquiry**, and **Fraud Reported Transaction** event types
5. Save

## SSL Certificate

SSL is managed by Certbot (Let's Encrypt) and auto-renews. To check renewal status:

```bash
systemctl status certbot.timer
```

To manually renew:

```bash
certbot renew
```

## Monitored Event Types

| Event Type | Triggers Email |
|------------|---------------|
| Chargeback | Yes |
| Pre-Chargeback Alert | Yes |
| Pre-Chargeback Inquiry | Yes |
| Fraud Reported Transaction | Yes |
| All other events | No (ignored) |

## Features

- **Checksum validation** — verifies Nuvei's SHA-256 signature to ensure webhooks are authentic
- **Duplicate protection** — tracks `EventId` in memory for 24 hours to prevent duplicate emails from Nuvei retries
- **File logging** — every received event is logged to `logs/events-YYYY-MM-DD.log` with timestamp, event type, status, and full payload
- **Auto-restart** — systemd restarts the service automatically if it crashes
