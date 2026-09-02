export const PER_TASK_CAP = 16;
export const DAILY_CAP = 24;

export function getCapHours() {
  const perTask = Number(process.env.PER_TASK_CAP_HOURS || PER_TASK_CAP);
  const daily = Number(process.env.DAILY_CAP_HOURS || process.env.DAILY_DURATION_CAP_HOURS || DAILY_CAP);
  return { perTask, daily };
}

export function validateTaskInput(data: {
  category?: unknown;
  title?: unknown;
  level?: unknown;
  durationHours?: unknown;
  date?: unknown;
}) {
  const { category, title, level, durationHours, date } = data;
  if (category !== "hustle" && category !== "humble") {
    throw { status: 400, code: "invalid-argument", message: "category must be hustle or humble" };
  }
  if (typeof title !== "string" || title.trim().length === 0 || title.trim().length > 100) {
    throw { status: 400, code: "invalid-argument", message: "title must be 1-100 chars" };
  }
  if (!Number.isInteger(level) || (level as number) < 1 || (level as number) > 5) {
    throw { status: 400, code: "invalid-argument", message: "level must be integer 1-5" };
  }
  if (typeof durationHours !== "number" || (durationHours as number) <= 0) {
    throw { status: 400, code: "invalid-argument", message: "durationHours must be > 0" };
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date as string)) {
    throw { status: 400, code: "invalid-argument", message: "date must be YYYY-MM-DD" };
  }
  const d = new Date((date as string) + "T00:00:00Z");
  if (isNaN(d.getTime())) throw { status: 400, code: "invalid-argument", message: "invalid date" };
  const todayStr = new Date().toISOString().slice(0, 10);
  if ((date as string) < todayStr) {
    throw { status: 400, code: "invalid-argument", message: "date cannot be in the past" };
  }
}
