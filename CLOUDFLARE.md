# Deploying CentralHub on Cloudflare Workers

This project uses Cloudflare Workers for HTTP and scheduled requests, and a Durable Object for its `/ws` WebSocket endpoint. MongoDB Atlas remains the database. The Workers Free plan supports the Worker runtime and Durable Objects within its current usage limits.

## One-time account setup

1. Install Node.js 20 or newer.
2. From this repository, run `npm install`.
3. Run `npx wrangler login` and finish the browser authorization.
4. In MongoDB Atlas, allow connections from Cloudflare Workers and use a database user with only the permissions this app needs. Workers do not have a fixed outbound IP for a narrow Atlas IP allowlist; use an appropriately scoped database user and review Atlas network access before broadening it.
5. Add the existing application secrets to the Worker (Wrangler prompts for each value; do not commit them):

   ```powershell
   npx wrangler secret put ATLAS_URL
   npx wrangler secret put ACCESS_KEY
   ```

   `ATLAS_URL` is the MongoDB connection string and `ACCESS_KEY` signs access tokens. Use the values from your existing local configuration, and rotate `ACCESS_KEY` if live users rely on tokens signed by the previous value.

## Deploy

```powershell
npm run deploy
```

Wrangler publishes the Worker to a `workers.dev` address. The `/` endpoint returns a small health response, `/api/...` serves the Express routes, `/ws` accepts device WebSockets, and OTP cleanup runs at minute 15 of every hour (UTC).

## Local development

Create `.dev.vars` (already ignored by Git) with `ATLAS_URL` and `ACCESS_KEY`, then run:

```powershell
npm run dev
```

Wrangler serves the local Worker, including `/ws`, on port 8787 by default. The `.env` file remains available for `npm start` on a regular Node.js server; that server also accepts WebSocket connections at `/ws` on the same port as the HTTP API (3000 by default, or `PORT`). Cloudflare ignores `.env` and uses Worker secrets instead.

When connecting a physical Android device to a local server, configure the app with the computer's LAN IP and the backend's port. Do not use the Expo/Metro port for the backend URL.

## Email utility

The forgot-password and feedback routes send through Resend's HTTPS API because SMTP sockets are not a portable Workers transport. The local `.env` currently contains placeholders for `RESEND_API_KEY` and `EMAIL_FROM`; replace them with a real Resend API key and a sender address verified by Resend before using those routes. Then upload them interactively with `npx wrangler secret put RESEND_API_KEY` and `npx wrangler secret put EMAIL_FROM`. The Cloudflare Worker does not have placeholder email credentials. Never commit `.env` or paste the API key into chat.
