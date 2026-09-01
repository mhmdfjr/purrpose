"use strict";
// Gemini free-tier AI suggestion — ARCHITECTURE.md 4.4 abstraction
// Generates once per weeklyReport and cached, per user decision 2026-09-01
// Fallback to null (caller keeps ruleBased) on timeout/error/quota
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAiSuggestion = generateAiSuggestion;
exports.buildWeeklySummary = buildWeeklySummary;
const GEMINI_TIMEOUT_MS = 10000;
const GEMINI_MODEL = "gemini-1.5-flash"; // free tier, fast
async function generateAiSuggestion(summary) {
    var _a, _b, _c, _d, _e, _f;
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!apiKey) {
        console.warn("[aiSuggestion] GEMINI_API_KEY not set, skipping");
        return null;
    }
    if (!summary || summary.trim().length === 0)
        return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const prompt = `Kamu adalah coach produktivitas & wellness yang supportive, non-judgmental (sesuai DESIGN.md tone: tidak menyalahkan). Berikan 2-3 kalimat saran personal, konkret, dan actionable dalam bahasa Indonesia santai, berdasarkan ringkasan minggu ini. Jangan ulangi angka mentah, fokus insight. Jika balance buruk, beri saran kecil yang achievable, bukan preachy.

Ringkasan: ${summary}

Balas hanya saran, tanpa preamble.`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 200,
                    temperature: 0.7,
                },
            }),
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            console.warn(`[aiSuggestion] Gemini failed ${res.status}: ${txt.slice(0, 300)}`);
            return null;
        }
        const data = (await res.json());
        const text = (_f = (_e = (_d = (_c = (_b = (_a = data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) === null || _f === void 0 ? void 0 : _f.trim();
        if (!text) {
            console.warn("[aiSuggestion] Gemini empty response", JSON.stringify(data).slice(0, 500));
            return null;
        }
        // Ensure not too long, keep concise
        return text.slice(0, 600);
    }
    catch (e) {
        console.warn("[aiSuggestion] fetch error/timeout", e);
        return null;
    }
    finally {
        clearTimeout(timeout);
    }
}
function buildWeeklySummary(params) {
    const { hustleScore, humbleScore, totalScore, balanceIndex, humblePercentage, completionRate, completed, missed } = params;
    return `Hustle ${hustleScore.toFixed(1)}, Humble ${humbleScore.toFixed(1)}, Total ${totalScore.toFixed(1)}, BalanceIndex ${balanceIndex.toFixed(0)}/100 (Humble ${humblePercentage.toFixed(0)}%), Completed ${completed}, Missed ${missed}, CompletionRate ${(completionRate * 100).toFixed(0)}%.`;
}
//# sourceMappingURL=aiSuggestion.js.map