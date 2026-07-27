/**
 * Lemon Squeezy integration.
 *
 * Uses the simplest supported flow: a "checkout link" per plan (copied from
 * your Lemon Squeezy dashboard — Store > Products > [product] > Share), with
 * query params appended to prefill the buyer's details and attach custom
 * data linking the purchase back to your local user record.
 *
 * No API key is needed for this flow (that's only required if you want to
 * generate checkouts dynamically via the API instead of query params — see
 * https://docs.lemonsqueezy.com/api/checkouts if you outgrow this later).
 *
 * You DO need the webhook signing secret, to verify that webhook requests
 * really came from Lemon Squeezy.
 */
require('dotenv').config();
const crypto = require('crypto');

const CHECKOUT_URLS = {
  single: process.env.LEMONSQUEEZY_CHECKOUT_URL_SINGLE,
  multi: process.env.LEMONSQUEEZY_CHECKOUT_URL_MULTI,
};

function buildCheckoutUrl(planKey, { userId, name, email }) {
  const base = CHECKOUT_URLS[planKey];
  if (!base) {
    throw new Error(`No Lemon Squeezy checkout URL configured for plan "${planKey}"`);
  }

  const url = new URL(base);
  url.searchParams.set('checkout[email]', email);
  url.searchParams.set('checkout[name]', name);
  url.searchParams.set('checkout[custom][user_id]', String(userId));
  // Keeps the buyer on a consistent, embeddable experience; safe to remove.
  url.searchParams.set('embed', '1');

  return url.toString();
}

/**
 * Verifies the X-Signature header Lemon Squeezy sends with every webhook.
 * IMPORTANT: this must run against the *raw* request body bytes, before any
 * JSON parsing — see index.js, which uses express.raw() for this route.
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const givenBuf = Buffer.from(signatureHeader, 'utf8');

  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}

module.exports = { buildCheckoutUrl, verifyWebhookSignature };
