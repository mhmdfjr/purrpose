import { describe, it, expect } from "vitest";
import { generateRuleBasedSuggestion } from "../reportSuggestion";

describe("generateRuleBasedSuggestion — PRD 7.2", () => {
  it("totalScore 0 -> empty week message", () => {
    const s = generateRuleBasedSuggestion({
      humbleScore: 0,
      hustleScore: 0,
      totalScore: 0,
      balanceIndex: 0,
      humblePercentage: 0,
      completionRate: 0,
    });
    expect(s).toContain("belum ada task");
  });

  it("balanceIndex >=80 -> good balance", () => {
    const s = generateRuleBasedSuggestion({
      humbleScore: 50,
      hustleScore: 50,
      totalScore: 100,
      balanceIndex: 90,
      humblePercentage: 50,
      completionRate: 0.9,
    });
    expect(s).toContain("Keseimbanganmu bagus");
  });

  it("humble <20% -> burnout warning", () => {
    const s = generateRuleBasedSuggestion({
      humbleScore: 10,
      hustleScore: 90,
      totalScore: 100,
      balanceIndex: 40,
      humblePercentage: 10,
      completionRate: 0.8,
    });
    expect(s).toContain("risiko burnout");
  });

  it("humble >80% -> productivity suggestion", () => {
    const s = generateRuleBasedSuggestion({
      humbleScore: 90,
      hustleScore: 10,
      totalScore: 100,
      balanceIndex: 40,
      humblePercentage: 85,
      completionRate: 0.8,
    });
    expect(s).toContain("Humble mendominasi");
  });

  it("completionRate <0.5 -> low completion suggestion", () => {
    const s = generateRuleBasedSuggestion({
      humbleScore: 30,
      hustleScore: 30,
      totalScore: 60,
      balanceIndex: 100,
      humblePercentage: 50,
      completionRate: 0.3,
    });
    expect(s).toContain("Completion rate");
    expect(s).toContain("banyak task yang terlewat");
  });
});
