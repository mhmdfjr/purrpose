// Remote Config abstraction — for M4 we use env fallback, later can switch to Firebase Remote Config SDK
// Values are tunable without redeploy per ARCHITECTURE 4.3

export type RemoteConfigValues = {
  dailyDurationCapHours: number;
  perTaskDurationCapHours: number;
  balanceWeightFloor: number;
  balanceWeightRange: number;
  completionWeightFloor: number;
  completionWeightRange: number;
  aiReportEnabled: boolean;
};

const defaults: RemoteConfigValues = {
  dailyDurationCapHours: 24,
  perTaskDurationCapHours: 16,
  balanceWeightFloor: 0.5,
  balanceWeightRange: 0.5,
  completionWeightFloor: 0.5,
  completionWeightRange: 0.5,
  aiReportEnabled: true,
};

export function getRemoteConfig(): RemoteConfigValues {
  // Env overrides for local tuning / Vercel env without true Remote Config
  return {
    dailyDurationCapHours: Number(process.env.DAILY_DURATION_CAP_HOURS || process.env.DAILY_CAP_HOURS || defaults.dailyDurationCapHours),
    perTaskDurationCapHours: Number(process.env.PER_TASK_CAP_HOURS || defaults.perTaskDurationCapHours),
    balanceWeightFloor: Number(process.env.BALANCE_WEIGHT_FLOOR || defaults.balanceWeightFloor),
    balanceWeightRange: Number(process.env.BALANCE_WEIGHT_RANGE || defaults.balanceWeightRange),
    completionWeightFloor: Number(process.env.COMPLETION_WEIGHT_FLOOR || defaults.completionWeightFloor),
    completionWeightRange: Number(process.env.COMPLETION_WEIGHT_RANGE || defaults.completionWeightRange),
    aiReportEnabled: process.env.AI_REPORT_ENABLED ? process.env.AI_REPORT_ENABLED === "true" : defaults.aiReportEnabled,
  };
}
