// Abstraction for IP geolocation — provider behind interface (ARCHITECTURE.md 4.4)

export interface GeolocationResult {
  city: string;
  region: string;
  country: string;
}

const IP2LOCATION_TIMEOUT_MS = 5000;

/**
 * Resolve city via ip2location.io
 * Free plan: 50k/month, requires API key.
 * Returns null on failure/quota exceeded — caller should handle graceful degradation.
 */
export async function resolveCityFromIp(
  ip: string,
): Promise<GeolocationResult | null> {
  if (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.")
  ) {
    return null; // local/dev IP — cannot geolocate
  }

  const apiKey = process.env.IP2LOCATION_API_KEY || "";
  if (!apiKey) {
    console.warn("[geolocation] IP2LOCATION_API_KEY not set, skipping resolve");
    return null;
  }

  const url = `https://api.ip2location.io/?key=${apiKey}&ip=${encodeURIComponent(ip)}&format=json`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      IP2LOCATION_TIMEOUT_MS,
    );
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(
        `[geolocation] ip2location.io failed ${res.status} for ip ${ip}`,
      );
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;

    // ip2location.io returns { city_name, region_name, country_name, ... } or error object
    if (data["error"]) {
      console.warn("[geolocation] ip2location error", data["error"]);
      return null;
    }

    const city = (data["city_name"] as string) || "";
    const region = (data["region_name"] as string) || "";
    const country = (data["country_name"] as string) || "";
    if (!city) return null;

    return { city, region, country };
  } catch (e) {
    console.warn("[geolocation] fetch failed", e);
    return null;
  }
}
