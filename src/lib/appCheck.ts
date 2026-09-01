"use client";

import { app } from "@/lib/firebase";

let initialized = false;

export async function initAppCheck() {
  if (initialized) return;
  if (typeof window === "undefined") return;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;

  // Allow debug token in dev: only init if debugToken explicitly set, otherwise skip to avoid 403 with dummy key
  if (process.env.NODE_ENV !== "production" && debugToken) {
    try {
      const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import("firebase/app-check");
      // Use debug provider via self.FIREBASE_APPCHECK_DEBUG_TOKEN
      (self as unknown as Record<string, unknown>)["FIREBASE_APPCHECK_DEBUG_TOKEN"] = debugToken;
      // Use ReCaptchaEnterprise only if siteKey exists, otherwise use debug provider alone via custom provider
      if (siteKey) {
        const provider = new ReCaptchaEnterpriseProvider(siteKey);
        initializeAppCheck(app, {
          provider,
          isTokenAutoRefreshEnabled: true,
        });
        initialized = true;
        console.info("[AppCheck] initialized with debug provider + siteKey");
        return;
      }
    } catch (e) {
      console.warn("[AppCheck] debug init failed", e);
    }
  }
  // Early skip if no siteKey in dev — prevents dummy-key 403
  if (!siteKey && process.env.NODE_ENV !== "production") {
    console.info("[AppCheck] skipping init in dev without siteKey (no dummy key to avoid 403)");
    return;
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
