"use client";

import { app } from "@/lib/firebase";

let initialized = false;

export async function initAppCheck() {
  if (initialized) return;
  if (typeof window === "undefined") return;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;

  // Allow debug token in dev: set to "true" to use debug provider
  if (process.env.NODE_ENV !== "production" && (debugToken || !siteKey)) {
    try {
      const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import("firebase/app-check");
      // Use debug provider via self.FIREBASE_APPCHECK_DEBUG_TOKEN
      if (debugToken) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (self as unknown as Record<string, unknown>)["FIREBASE_APPCHECK_DEBUG_TOKEN"] = debugToken;
      } else {
        // Auto-generate debug token for emulator
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (self as unknown as Record<string, unknown>)["FIREBASE_APPCHECK_DEBUG_TOKEN"] = true;
      }
      // Still need provider, use ReCaptchaEnterprise with dummy key if missing
      const provider = new ReCaptchaEnterpriseProvider(siteKey || "dummy-key-for-debug");
      initializeAppCheck(app, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });
      initialized = true;
      console.info("[AppCheck] initialized with debug provider");
      return;
    } catch (e) {
      console.warn("[AppCheck] debug init failed", e);
    }
  }

  if (!siteKey) {
    console.info("[AppCheck] NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set, skipping AppCheck init (M7 will enforce only if ENFORCE_APP_CHECK=true)");
    return;
  }

  try {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import("firebase/app-check");
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    initialized = true;
    console.info("[AppCheck] initialized with ReCaptchaV3");
  } catch (e) {
    console.warn("[AppCheck] init failed", e);
  }
}
