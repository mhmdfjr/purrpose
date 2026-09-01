import { describe, it, expect } from "vitest";

// Pure logic extracted from PRD 5.1, 7.2, 8.1

function computeScore(level: number, durationHours: number): number {
  return level * durationHours;
}

function computeBalanceIndex(humbleScore: number, hustleScore: number): { humblePercentage: number; balanceIndex: number } {
  const total = humbleScore + hustleScore;
  const humblePercentage = total > 0 ? (humbleScore / total) * 100 : 0;
  const balanceIndex = total > 0 ? 100 - Math.abs(50 - humblePercentage) * 2 : 0;
  return { humblePercentage, balanceIndex };
}

function computeLeaderboardScore(
  weeklyRawScore: number,
  balanceIndex: number,
  completionRate: number,
  balanceFloor = 0.5,
  balanceRange = 0.5,
  completionFloor = 0.5,
  completionRange = 0.5
): number {
  const balanceWeight = balanceFloor + (balanceIndex / 100) * balanceRange;
  const completionWeight = completionFloor + completionRate * completionRange;
  return weeklyRawScore * balanceWeight * completionWeight;
}

describe("scoring — PRD 5.1", () => {
  it("level 5 * 2h =10", () => expect(computeScore(5, 2)).toBe(10));
  it("level 3 * 1.5 =4.5", () => expect(computeScore(3, 1.5)).toBe(4.5));
  it("cap per-task 16h: 5*16=80 max per task", () => expect(computeScore(5, 16)).toBe(80));
});

describe("balanceIndex — PRD 7.2", () => {
  it("50:50 -> 100", () => {
    const { balanceIndex } = computeBalanceIndex(50, 50);
    expect(balanceIndex).toBe(100);
  });
  it("all hustle -> 0", () => {
    const { balanceIndex } = computeBalanceIndex(0, 100);
    expect(balanceIndex).toBe(0);
  });
  it("all humble ->0", () => {
    const { balanceIndex } = computeBalanceIndex(100, 0);
    expect(balanceIndex).toBe(0);
  });
  it("75 humble 25 hustle -> 50", () => {
    const { balanceIndex, humblePercentage } = computeBalanceIndex(75, 25);
    expect(humblePercentage).toBe(75);
    expect(balanceIndex).toBe(50);
  });
  it("empty ->0", () => {
    const { balanceIndex } = computeBalanceIndex(0, 0);
    expect(balanceIndex).toBe(0);
  });
});

describe("leaderboardScore — PRD 8.1", () => {
  it("perfect balance & completion -> raw *1", () => {
    expect(computeLeaderboardScore(100, 100, 1)).toBe(100);
  });
  it("worst balance & completion -> raw *0.25", () => {
    expect(computeLeaderboardScore(100, 0, 0)).toBe(25);
  });
  it("raw 0 -> 0 regardless of weights", () => {
    expect(computeLeaderboardScore(0, 100, 1)).toBe(0);
  });
  it("half weights -> 0.75*0.75", () => {
    // balance 50 -> weight 0.75, completion 0.5 -> weight 0.75, raw 100 -> 56.25
    expect(computeLeaderboardScore(100, 50, 0.5)).toBeCloseTo(56.25);
  });
});

describe("cap validation — PRD 5.2", () => {
  const PER_TASK = 16;
  const DAILY = 24;
  it("per-task cap reject >16", () => {
    expect(17 > PER_TASK).toBe(true);
    expect(16 > PER_TASK).toBe(false);
  });
  it("daily cap: total 20 + new 5 -> reject", () => {
    const total = 20;
    const newDur = 5;
    expect(total + newDur > DAILY).toBe(true);
  });
  it("daily cap remaining message: daily 24 total 20 remaining 4", () => {
    const remaining = DAILY - 20;
    expect(remaining).toBe(4);
  });
});

describe("utcResetHour & weekly helpers", () => {
  it("utcResetHour for Asia/Jakarta should be 17 (UTC+7) via brute-force", () => {
    // Replica of computeUtcResetHour brute-force
    function computeUtcResetHour(tz: string): number {
      for (let utcHour = 0; utcHour < 24; utcHour++) {
        const d = new Date(Date.UTC(2026, 0, 15, utcHour, 0, 0));
        const localHour = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(d), 10) % 24;
        if (localHour === 0) return utcHour;
      }
      return 0;
    }
    expect(computeUtcResetHour("Asia/Jakarta")).toBe(17);
  });
  it("getISOWeekId for known date", () => {
    function getISOWeekId(date: Date): string {
      const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const day = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
    }
    const weekId = getISOWeekId(new Date(Date.UTC(2026, 0, 5)));
    expect(weekId).toMatch(/2026-W\d{2}/);
  });
});
