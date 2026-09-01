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
exports.regenerateWeeklySuggestion = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const aiSuggestion_1 = require("../services/aiSuggestion");
const remoteConfig_1 = require("../services/remoteConfig");
const appCheck_1 = require("../utils/appCheck");
const db = admin.firestore();
// Cooldown 1 hour per user per API.md 7
const COOLDOWN_MS = 60 * 60 * 1000;
exports.regenerateWeeklySuggestion = (0, https_1.onCall)(async (request) => {
    (0, appCheck_1.enforceAppCheck)(request);
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    const uid = request.auth.uid;
    const { weekId } = request.data;
    if (!weekId || typeof weekId !== "string" || !/^\d{4}-W\d{2}$/.test(weekId)) {
        throw new https_1.HttpsError("invalid-argument", "weekId required as YYYY-Www");
    }
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists)
        throw new https_1.HttpsError("not-found", "User not found");
    const userData = userSnap.data();
    if (userData.aiReportEnabled === false) {
        throw new https_1.HttpsError("failed-precondition", "Enable AI report in profile first");
    }
    const remote = (0, remoteConfig_1.getRemoteConfig)();
    if (!remote.aiReportEnabled) {
        throw new https_1.HttpsError("failed-precondition", "AI reports disabled globally");
    }
    const reportRef = db.doc(`users/${uid}/weeklyReports/${weekId}`);
    const reportSnap = await reportRef.get();
    if (!reportSnap.exists)
        throw new https_1.HttpsError("not-found", "Weekly report not found for this weekId");
    const report = reportSnap.data();
    // Cooldown check
    if (report.lastAiRegeneratedAt) {
        const last = report.lastAiRegeneratedAt.toMillis();
        const now = Date.now();
        if (now - last < COOLDOWN_MS) {
            const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
            throw new https_1.HttpsError("resource-exhausted", `Cooldown active, wait ${waitSec}s`);
        }
    }
    // If already has cached aiSuggestion and user wants regenerate, we still regenerate (overwrite)
    const humblePercentage = report.totalScore > 0 ? (report.humbleScore / report.totalScore) * 100 : 0;
    const summary = (0, aiSuggestion_1.buildWeeklySummary)({
        hustleScore: report.hustleScore,
        humbleScore: report.humbleScore,
        totalScore: report.totalScore,
        balanceIndex: report.balanceIndex,
        humblePercentage,
        completionRate: report.completionRate,
        completed: report.completedTasksCount,
        missed: report.missedTasksCount,
    });
    const ai = await (0, aiSuggestion_1.generateAiSuggestion)(summary);
    if (!ai) {
        logger.warn(`[regenerateWeeklySuggestion] Gemini failed for ${uid} ${weekId}, keeping existing`);
        throw new https_1.HttpsError("unavailable", "AI generation failed, try again later");
    }
    await reportRef.update({
        aiSuggestion: ai,
        lastAiRegeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { weekId, aiSuggestion: ai };
});
//# sourceMappingURL=weeklyReport.js.map