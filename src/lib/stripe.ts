import Stripe from "stripe";

// Lazy initialization to prevent build-time errors
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    // Trim whitespace in case the key was copy-pasted with extra spaces
    let secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      console.error("STRIPE_SECRET_KEY is missing from environment variables");
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    
    // Log key prefix for debugging (safe - only shows first 8 chars which is just the prefix)
    const originalPrefix = secretKey.substring(0, 8);
    console.log("Stripe key original prefix:", originalPrefix, "length:", secretKey.length);
    
    // Validate key format - must be a secret key (sk_) or restricted key (rk_), not publishable (pk_)
    const keyLower = secretKey.toLowerCase();
    const validPrefixes = ["sk_test_", "sk_live_", "rk_test_", "rk_live_"];
    const hasValidPrefix = validPrefixes.some(prefix => keyLower.startsWith(prefix));
    
    if (!hasValidPrefix) {
      console.error("STRIPE_SECRET_KEY has invalid format. Prefix:", originalPrefix, "- expected sk_test_, sk_live_, rk_test_, or rk_live_");
      throw new Error("STRIPE_SECRET_KEY has invalid format");
    }
    
    // Fix common case error: Stripe keys must have lowercase prefix (sk_ not Sk_)
    // If the prefix has wrong case, fix it
    if (secretKey.substring(0, 3) !== secretKey.substring(0, 3).toLowerCase()) {
      console.log("Fixing Stripe key case: converting prefix to lowercase");
      // Replace first 8 characters with lowercase version
      secretKey = secretKey.substring(0, 8).toLowerCase() + secretKey.substring(8);
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
  get refunds() {
    return getStripe().refunds;
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