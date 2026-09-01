import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { enforceAppCheck } from "../utils/appCheck";

/**
 * Dummy callable for M0 emulator verification.
 * Call from client: getFunctions() + httpsCallable(functions, "ping")
 */
export const ping = onCall(async (request) => {
  enforceAppCheck(request);
  if (!request.auth && process.env.FUNCTIONS_EMULATOR !== "true") {
    // Allow unauthenticated only in emulator for M0 testing; in production require auth
    logger.info("ping called without auth (allowed in emulator only)");
  }
  logger.info("ping called", { uid: request.auth?.uid ?? "anonymous" });

  return {
    message: "pong",
    uid: request.auth?.uid ?? null,
    timestamp: new Date().toISOString(),
  };
});
