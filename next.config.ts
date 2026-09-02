import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // firebase-admin v13 uses jwks-rsa@3 + jose@4 CJS (no ESM require error).
  // Keep admin external for serverless cold-start; do NOT transpile jose/jwks-rsa
  // when external — Turbopack's externalImport uses require() which fails on jose@6 ESM.
  serverExternalPackages: ["firebase-admin", "@firebase/rules-unit-testing"],
};

export default nextConfig;
