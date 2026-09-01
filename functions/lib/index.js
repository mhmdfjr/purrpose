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
exports.regenerateWeeklySuggestion = exports.weeklyCycleJob = exports.taskCutoverJob = exports.completeTask = exports.deleteTask = exports.updateTask = exports.createTask = exports.updateProfile = exports.ensureUser = exports.ping = void 0;
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
// Global options — region asia-southeast2 (Jakarta) per user decision
(0, v2_1.setGlobalOptions)({ region: "asia-southeast2", maxInstances: 10 });
admin.initializeApp();
// Export callable functions
var ping_1 = require("./callable/ping");
Object.defineProperty(exports, "ping", { enumerable: true, get: function () { return ping_1.ping; } });
var user_1 = require("./callable/user");
Object.defineProperty(exports, "ensureUser", { enumerable: true, get: function () { return user_1.ensureUser; } });
Object.defineProperty(exports, "updateProfile", { enumerable: true, get: function () { return user_1.updateProfile; } });
var tasks_1 = require("./callable/tasks");
Object.defineProperty(exports, "createTask", { enumerable: true, get: function () { return tasks_1.createTask; } });
Object.defineProperty(exports, "updateTask", { enumerable: true, get: function () { return tasks_1.updateTask; } });
Object.defineProperty(exports, "deleteTask", { enumerable: true, get: function () { return tasks_1.deleteTask; } });
Object.defineProperty(exports, "completeTask", { enumerable: true, get: function () { return tasks_1.completeTask; } });
var taskCutover_1 = require("./scheduled/taskCutover");
Object.defineProperty(exports, "taskCutoverJob", { enumerable: true, get: function () { return taskCutover_1.taskCutoverJob; } });
var weeklyCycle_1 = require("./scheduled/weeklyCycle");
Object.defineProperty(exports, "weeklyCycleJob", { enumerable: true, get: function () { return weeklyCycle_1.weeklyCycleJob; } });
var weeklyReport_1 = require("./callable/weeklyReport");
Object.defineProperty(exports, "regenerateWeeklySuggestion", { enumerable: true, get: function () { return weeklyReport_1.regenerateWeeklySuggestion; } });
//# sourceMappingURL=index.js.map