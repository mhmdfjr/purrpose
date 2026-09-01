// Abstraction for IP geolocation — provider behind interface (ARCHITECTURE.md 4.4)
// Implementation will be added in M1/M6; for M0 this is a placeholder to satisfy folder structure.

export interface GeolocationResult {
  city: string;
  region: string;
  country: string;
}

export async function resolveCityFromIp(ip: string): Promise<GeolocationResult | null> {
  // TODO: implement ip2location.io call in M1
  // For now return null to indicate not implemented
  void ip;
  return null;
}
