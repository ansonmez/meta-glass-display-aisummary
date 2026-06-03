# Translation Display

A real-time translation display for Meta Display Glasses. Your iOS app posts translated text to a secure endpoint, and it appears on the glasses within 2 seconds.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ansonmez/meta-glass-display-aisummary&root-directory=translation-display&env=TRANSLATION_TOKEN&envDescription=Your+secret+access+token.+Pick+any+string+you+like+%E2%80%94+you+will+use+it+in+your+iOS+app+and+glasses+URL.)

---

## How it works

```
iOS app  →  POST /api/message  →  Vercel KV  →  browser polls every 2s  →  Meta Glasses display
```

---

## Deploy to Vercel

### Step 1 — Click the button above

The button will:
- Clone this repo to your own GitHub account
- Pre-fill the root directory as `translation-display`
- Ask you to set `TRANSLATION_TOKEN` — pick any secret string (e.g. `my-secret-token-123`)

Click **Deploy**.

### Step 2 — Add Vercel Blob (free, required)

After the first deploy:

1. Go to your Vercel project dashboard
2. Click **Storage** → **Create Blob Store**
3. Click **Connect** to link it to this project
4. Click **Redeploy** to apply

Your app is now live at:
```
https://your-project.vercel.app/?token=YOUR_TOKEN
```

---

## iOS App Setup

Send translations to your deployment:

```
POST https://your-project.vercel.app/api/message?token=YOUR_TOKEN
Content-Type: application/json

{
  "text": "Hello, how are you?",
  "type": "translation"
}
```

Or pass the token as a header:
```
X-Token: YOUR_TOKEN
```

The `type` field is optional. Accepted values: `translation`, `summary`, `fulltext`.

---

## Meta Glasses Setup

### Option A — QR code (recommended)

Generate a QR code from this deep link and scan it with the Meta AI app:

```
fb-viewapp://web_app_deep_link?appName=Translation Display&appUrl=https%3A%2F%2Fyour-project.vercel.app%2F%3Ftoken%3DYOUR_TOKEN
```

Replace `your-project` and `YOUR_TOKEN` with your actual values.

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
- The token is stored only as a Vercel environment variable — it is never in this repo

---

## Changing your token

1. Update `TRANSLATION_TOKEN` in Vercel **Project Settings → Environment Variables**
2. Click **Redeploy**
3. Update your iOS app and glasses URL with the new token

---

## Self-hosting with Tailscale (no Vercel)

Run everything on your own machine and expose it via [Tailscale](https://tailscale.com) (free).

### 1. Clone and start

```bash
git clone https://github.com/ansonmez/meta-glass-display-aisummary.git
cd meta-glass-display-aisummary/translation-display
TRANSLATION_TOKEN=your-secret node server.js
```

The server runs on port `9090` by default. Override with `PORT=8080`.

### 2. Expose publicly via Tailscale Funnel

Run once — persists across reboots:

```bash
sudo tailscale funnel 9090
```

Your app is live at:
```
https://<your-machine>.ts.net/?token=YOUR_TOKEN
```

Find your Tailscale hostname with `tailscale status`.
To stop: `sudo tailscale funnel --off`

### 3. Local network only (no Tailscale)

```
http://<your-local-ip>:9090/?token=YOUR_TOKEN
```

Find your IP with `ip addr show` or `ifconfig`.

### 4. iOS app endpoint (self-hosted)

```
POST https://<your-machine>.ts.net/api/message?token=YOUR_TOKEN
```

> **Note:** The self-hosted server stores messages in memory — messages are lost on restart. No Vercel KV needed.
