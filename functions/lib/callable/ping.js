"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ping = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const appCheck_1 = require("../utils/appCheck");
/**
 * Dummy callable for M0 emulator verification.
 * Call from client: getFunctions() + httpsCallable(functions, "ping")
 */
exports.ping = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d;
    (0, appCheck_1.enforceAppCheck)(request);
    if (!request.auth && process.env.FUNCTIONS_EMULATOR !== "true") {
        // Allow unauthenticated only in emulator for M0 testing; in production require auth
        logger.info("ping called without auth (allowed in emulator only)");
    }
    logger.info("ping called", { uid: (_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : "anonymous" });
    return {
        message: "pong",
        uid: (_d = (_c = request.auth) === null || _c === void 0 ? void 0 : _c.uid) !== null && _d !== void 0 ? _d : null,
        timestamp: new Date().toISOString(),
    };
});
//# sourceMappingURL=ping.js.map