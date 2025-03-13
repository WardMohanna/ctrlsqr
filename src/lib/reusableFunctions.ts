// src/lib/reusableFunctions.ts
import Log, { ILog } from "@/models/Logs";

export async function endActiveLogForUser(userId: string, activeLog: ILog) {
  const now = new Date();
  const start = activeLog.startTime;
  const sessionDuration = now.getTime() - start.getTime();
  const previousDuration = activeLog.accumulatedDuration || 0;
  const totalDuration = previousDuration + sessionDuration;
  // Update the active log with endTime and new accumulatedDuration
  await Log.findByIdAndUpdate(activeLog._id, {
    endTime: now,
    accumulatedDuration: totalDuration,
  });
}
