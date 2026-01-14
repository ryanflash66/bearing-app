import Stripe from "stripe";

// Lazy initialization to prevent build-time errors
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    // API version should be updated when Stripe releases new versions
    // Check https://stripe.com/docs/upgrades for latest versions
    // Current: 2025-12-15.clover (as of Jan 2026)
    _stripe = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// Backwards-compatible export (use getStripe() for lazy init)
export const stripe = {
  get checkout() {
    return getStripe().checkout;
  },
  get webhooks() {
    return getStripe().webhooks;
  },
};

// Service prices in cents
export const SERVICE_PRICES = {
  isbn: 12500, // $125.00
} as const;

// Service metadata for Stripe
export const SERVICE_METADATA = {
  isbn: {
    name: "ISBN Registration",
    description: "Official ISBN assignment for your book with barcode generation",
  },
} as const;
