"use strict";
// Abstraction for IP geolocation — provider behind interface (ARCHITECTURE.md 4.4)
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCityFromIp = resolveCityFromIp;
const IP2LOCATION_TIMEOUT_MS = 5000;
/**
 * Resolve city via ip2location.io
 * Free plan: 50k/month, requires API key.
 * Returns null on failure/quota exceeded — caller should handle graceful degradation.
 */
async function resolveCityFromIp(ip) {
    if (!ip ||
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip.startsWith("192.168.") ||
        ip.startsWith("10.")) {
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
        const timeout = setTimeout(() => controller.abort(), IP2LOCATION_TIMEOUT_MS);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
            console.warn(`[geolocation] ip2location.io failed ${res.status} for ip ${ip}`);
            return null;
        }
        const data = (await res.json());
        // ip2location.io returns { city_name, region_name, country_name, ... } or error object
        if (data["error"]) {
            console.warn("[geolocation] ip2location error", data["error"]);
            return null;
        }
        const city = data["city_name"] || "";
        const region = data["region_name"] || "";
        const country = data["country_name"] || "";
        if (!city)
            return null;
        return { city, region, country };
    }
    catch (e) {
        console.warn("[geolocation] fetch failed", e);
        return null;
    }
}
//# sourceMappingURL=geolocation.js.map