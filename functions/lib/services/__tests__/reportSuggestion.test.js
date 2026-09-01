"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const reportSuggestion_1 = require("../reportSuggestion");
(0, vitest_1.describe)("generateRuleBasedSuggestion — PRD 7.2", () => {
    (0, vitest_1.it)("totalScore 0 -> empty week message", () => {
        const s = (0, reportSuggestion_1.generateRuleBasedSuggestion)({
            humbleScore: 0,
            hustleScore: 0,
            totalScore: 0,
            balanceIndex: 0,
            humblePercentage: 0,
            completionRate: 0,
        });
        (0, vitest_1.expect)(s).toContain("belum ada task");
    });
    (0, vitest_1.it)("balanceIndex >=80 -> good balance", () => {
        const s = (0, reportSuggestion_1.generateRuleBasedSuggestion)({
            humbleScore: 50,
            hustleScore: 50,
            totalScore: 100,
            balanceIndex: 90,
            humblePercentage: 50,
            completionRate: 0.9,
        });
        (0, vitest_1.expect)(s).toContain("Keseimbanganmu bagus");
    });
    (0, vitest_1.it)("humble <20% -> burnout warning", () => {
        const s = (0, reportSuggestion_1.generateRuleBasedSuggestion)({
            humbleScore: 10,
            hustleScore: 90,
            totalScore: 100,
            balanceIndex: 40,
            humblePercentage: 10,
            completionRate: 0.8,
        });
        (0, vitest_1.expect)(s).toContain("risiko burnout");
    });
    (0, vitest_1.it)("humble >80% -> productivity suggestion", () => {
        const s = (0, reportSuggestion_1.generateRuleBasedSuggestion)({
            humbleScore: 90,
            hustleScore: 10,
            totalScore: 100,
            balanceIndex: 40,
            humblePercentage: 85,
            completionRate: 0.8,
        });
        (0, vitest_1.expect)(s).toContain("Humble mendominasi");
    });
    (0, vitest_1.it)("completionRate <0.5 -> low completion suggestion", () => {
        const s = (0, reportSuggestion_1.generateRuleBasedSuggestion)({
            humbleScore: 30,
            hustleScore: 30,
            totalScore: 60,
            balanceIndex: 100,
            humblePercentage: 50,
            completionRate: 0.3,
        });
        (0, vitest_1.expect)(s).toContain("Completion rate");
        (0, vitest_1.expect)(s).toContain("banyak task yang terlewat");
    });
});
//# sourceMappingURL=reportSuggestion.test.js.map