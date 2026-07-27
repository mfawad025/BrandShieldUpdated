# BrandShield Backend

Handles:
1. **Registration** — name, email, password, plan, platform(s), stage-name
   aliases, and links to the creator's own original content (proof of
   ownership — not the infringing link).
2. **Lemon Squeezy checkout** — redirect-based hosted checkout, no card data
   ever touches this server.
3. **Daily scanning** — searches Google (web + images) for each subscriber's
   aliases, attempts best-effort DMCA takedown notices, rechecks previously
   reported leaks for removal.
4. **Email reports** — sent on each subscriber's plan cadence (daily for
   Multi-Platform, every 3 days for Single Platform).

## Plans

| Plan | Price | Platforms covered | Report cadence |
|---|---|---|---|
| Single Platform | $50/mo | Exactly one (e.g. just OnlyFans) | Every 3 days |
| Multi-Platform | $100/mo | Two or more (e.g. OnlyFans + Chaturbate + PornHub) | Daily |

## Setup

```bash
cd server
npm install
cp env.example.txt .env
```

### Lemon Squeezy

1. Create a store at lemonsqueezy.com if you haven't already.
2. Create two products: "Single Platform" ($50/mo) and "Multi-Platform" ($100/mo).
3. On each product, click **Share** and copy the checkout link into `.env`
   as `LEMONSQUEEZY_CHECKOUT_URL_SINGLE` / `LEMONSQUEEZY_CHECKOUT_URL_MULTI`.
4. Go to **Settings > Webhooks**, add a webhook pointing at
   `https://<your-deployed-backend>/api/lemonsqueezy/webhook`, and subscribe
   it to at least `order_created` and `subscription_created`.
5. Copy the signing secret Lemon Squeezy gives you into
   `LEMONSQUEEZY_WEBHOOK_SECRET`.
6. Test in Lemon Squeezy's **Test mode** first — you can simulate webhook
   events from a test subscription without a real card.

No Lemon Squeezy API key is required for this flow — the checkout link +
webhook secret is all you need. (An API key would only be needed if you
later want to generate checkouts dynamically instead of via query params,
or build a customer portal integration.)

### Google Custom Search, Email

Same as before — see the comments in `env.example.txt`. If left
unconfigured, scans log a warning and skip, and report emails print to the
console instead of sending, so you can still test the rest of the flow.

## Run locally

```bash
npm start
```

Test registration by POSTing to `/api/register`, or use `register.html`
pointed at this server. Test the scan pipeline directly:

```bash
npm run scan-now
# or, with the server running:
curl -X POST http://localhost:4242/api/scan/run-now
```

## What's real vs. best-effort here

- **Finding leaks**: real, via Google Custom Search (both web and image
  search). Text-based and reverse-lookup-by-description only — it won't
  recognize a leaked photo by its pixels the way a reverse-image or facial
  recognition API would. That's a future upgrade, not a rewrite — add
  another search function next to `googleSearch.js` and call it from
  `scanner.js`.
- **Filing takedowns**: guesses `abuse@<hostname>` and emails a templated
  DMCA notice. Many hosts don't monitor that address or require a web form
  instead — treat "reported" as "attempted," not "delivered and acted on."
- **Confirming removal**: a simple HTTP status recheck. A signal, not proof.
- **Payment → active account**: depends entirely on the Lemon Squeezy
  webhook actually reaching your server and the signature verifying. Test
  this thoroughly in Lemon Squeezy's test mode before going live — if the
  webhook URL is wrong or the server is down when it fires, accounts will
  stay stuck on `pending_payment` forever with no automatic retry path
  beyond Lemon Squeezy's own retry window.

## Deployment notes

- Needs real Node hosting (Render, Railway, a VPS) — not GitHub Pages.
- **SQLite is local to the server's filesystem.** Free tiers on hosts like
  Render wipe local disk on redeploy. For real subscribers, swap `db.js`'s
  connection for a hosted Postgres (Supabase/Neon both have free tiers) —
  the SQL is plain enough to translate directly.
- Keep the server **always-on** (not a free tier that sleeps) or the daily
  cron job won't fire reliably. Alternative: use an external cron service
  (e.g. cron-job.org, free) to hit `/api/scan/run-now` on a schedule instead
  of relying on `node-cron` inside a sleeping process.
- Watch your Google Custom Search quota (100 free queries/day) — the query
  count per subscriber scales with how many aliases and platforms they have,
  so budget accordingly as you grow.
