"use strict";
// Abstraction for AI suggestion — provider behind interface (ARCHITECTURE.md 4.4)
// Implementation will be added in M5; for M0 this is a placeholder.
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAiSuggestion = generateAiSuggestion;
async function generateAiSuggestion(summary) {
    void summary;
    // TODO: implement LLM call with timeout + fallback to rule-based
    return null;
}
//# sourceMappingURL=aiSuggestion.js.map