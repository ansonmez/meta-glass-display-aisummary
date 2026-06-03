# Translation Display

A real-time translation display for Meta Display Glasses. Your iOS app posts translated text to a secure endpoint, and it appears on the glasses within 2 seconds.

## How it works

```
iOS app  →  POST /api/message  →  Vercel KV  →  browser polls every 2s  →  Meta Glasses display
```

---

## Deploy to Vercel

### 1. Fork this repo

Click **Fork** on GitHub, then connect the fork to your Vercel account at [vercel.com/new](https://vercel.com/new).

When prompted for the **Root Directory**, set it to `translation-display`.

### 2. Set your token

In Vercel project settings → **Environment Variables**, add:

| Name | Value |
|------|-------|
| `TRANSLATION_TOKEN` | A secret string you choose, e.g. `my-secret-token-123` |

### 3. Add Vercel KV (free)

In your Vercel project dashboard:
1. Go to **Storage** → **Create Database** → **KV**
2. Click **Connect** to link it to your project
3. Vercel auto-injects the required environment variables — nothing else needed

### 4. Deploy

Trigger a deployment (push a commit or click **Redeploy** in the dashboard). Your app will be live at:

```
https://your-project.vercel.app/?token=YOUR_TOKEN
```

---

## iOS App Setup

Send translations to your Vercel deployment:

```
POST https://your-project.vercel.app/api/message?token=YOUR_TOKEN
Content-Type: application/json

{
  "text": "Hello, how are you?",
  "type": "translation"
}
```

Or pass the token as a header instead:

```
X-Token: YOUR_TOKEN
```

The `type` field is optional. Accepted values: `translation`, `summary`, `fulltext`.

---

## Meta Glasses Setup

### Option A — QR code (recommended)

Generate a QR code with this deep link and scan it with the Meta AI app:

```
fb-viewapp://web_app_deep_link?appName=Translation Display&appUrl=https%3A%2F%2Fyour-project.vercel.app%2F%3Ftoken%3DYOUR_TOKEN
```

URL-encode your full app URL before inserting it into the deep link.

### Option B — Manual

1. Open the **Meta AI** app on your phone
2. Go to **Devices** → **Display Glasses settings**
3. Navigate to **App connections** → **Web apps** → **Add a web app**
4. Name: `Translation Display`
5. URL: `https://your-project.vercel.app/?token=YOUR_TOKEN`

---

## Security

- The web app requires `?token=YOUR_TOKEN` in the URL — without it, access is denied
- All API endpoints require the token — requests without it return `403 Forbidden`
- Token is stored as a Vercel environment variable, never in the code

---

## Changing your token

1. Update `TRANSLATION_TOKEN` in Vercel environment variables
2. Redeploy
3. Update your iOS app and glasses URL with the new token

---

## Self-hosting with Tailscale (no Vercel)

If you prefer to run everything on your own machine and expose it securely via [Tailscale](https://tailscale.com) (free), follow these steps.

### Prerequisites

- Node.js installed
- Tailscale installed and signed in (`tailscale status`)

### 1. Install and run the server

```bash
git clone https://github.com/ansonmez/meta-glass-display-aisummary.git
cd meta-glass-display-aisummary/translation-display
node server-example.js
```

The server runs on port `9090` by default. Override with `PORT=8080 node server-example.js`.

### 2. Expose via Tailscale Funnel (public HTTPS)

Tailscale Funnel gives your machine a permanent public HTTPS URL. Run once — it persists across reboots:

```bash
sudo tailscale funnel 9090
```

Your app will be live at:
```
https://<your-machine>.ts.net/?token=YOUR_TOKEN
```

Check your machine's Tailscale hostname:
```bash
tailscale status
```

To stop the funnel:
```bash
sudo tailscale funnel --off
```

### 3. Access on your local network (no Tailscale)

If you only need access from devices on the same Wi-Fi network:

```
http://<your-local-ip>:9090/?token=YOUR_TOKEN
```

Find your local IP with `ip addr show` or `ifconfig`.

### 4. iOS app endpoint (self-hosted)

```
POST https://<your-machine>.ts.net/api/message?token=YOUR_TOKEN
```

### Notes

- The self-hosted server stores messages in memory — messages are lost on restart
- No Vercel KV setup needed for self-hosting
- The token is set in `config.js` — change it there and restart the server
