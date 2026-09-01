import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";

// Global options — region asia-southeast2 (Jakarta) per user decision
setGlobalOptions({ region: "asia-southeast2", maxInstances: 10 });

admin.initializeApp();

// Export callable functions
export { ping } from "./callable/ping";
export { ensureUser, updateProfile } from "./callable/user";
export { createTask, updateTask, deleteTask, completeTask } from "./callable/tasks";

export { taskCutoverJob } from "./scheduled/taskCutover";
export { weeklyCycleJob } from "./scheduled/weeklyCycle";
export { regenerateWeeklySuggestion } from "./callable/weeklyReport";
