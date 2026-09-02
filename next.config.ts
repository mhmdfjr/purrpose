import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // firebase-admin + jose ESM issue (jwks-rsa require('jose') fails on Turbopack)
  // Pin jose to 4.15.5 CJS via overrides, then keep admin external
  serverExternalPackages: ["firebase-admin", "@firebase/rules-unit-testing"],
  transpilePackages: ["jose", "jwks-rsa"],
};

export default nextConfig;
