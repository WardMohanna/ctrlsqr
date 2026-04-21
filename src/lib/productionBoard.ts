/** Shared column keys: todo → in progress → ready to finalize (review) → done (finished). */
export type BoardColumnId =
  | "todo"
  | "inProgress"
  | "readyToFinalize"
  | "done";

/** @deprecated alias */
export type TodayColumnId = BoardColumnId;
/** @deprecated alias */
export type WeekColumnId = BoardColumnId;

export const BOARD_COLUMN_ORDER: BoardColumnId[] = [
  "todo",
  "inProgress",
  "readyToFinalize",
  "done",
];

export interface WorkLogLike {
  employee: string;
  startTime: string | Date;
  endTime?: string | Date | null;
  /** Milliseconds, set when a segment is closed (see production task API). */
  accumulatedDuration?: number;
}

/** Sum of all work segments: closed logs use `accumulatedDuration` or end−start; open logs use `now − startTime`. */
export function totalWorkDurationMs(
  task: { employeeWorkLogs?: WorkLogLike[] },
  now: number = Date.now(),
): number {
  const logs = task.employeeWorkLogs ?? [];
  let total = 0;
  for (const log of logs) {
    const start = new Date(log.startTime).getTime();
    if (Number.isNaN(start)) continue;
    const open =
      log.endTime == null || log.endTime === "" || log.endTime === undefined;
    if (open) {
      total += Math.max(0, now - start);
    } else {
      const acc = Number(log.accumulatedDuration ?? 0);
      if (acc > 0) {
        total += acc;
      } else {
        const end = new Date(log.endTime as string | Date).getTime();
        if (!Number.isNaN(end)) {
          total += Math.max(0, end - start);
        }
      }
    }
  }
  return total;
}

/** Compact duration for card UI: `H:MM:SS` if ≥1h, else `M:SS`. */
export function formatDurationCompact(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface TaskBoardLike {
  status: string;
  employeeWorkLogs?: WorkLogLike[];
  productionDate?: string | Date;
}

export function hasOpenWorkLog(task: TaskBoardLike): boolean {
  const logs = task.employeeWorkLogs ?? [];
  return logs.some(
    (log) => log.endTime == null || log.endTime === "" || log.endTime === undefined,
  );
}

export function classifyTodayColumn(task: TaskBoardLike): BoardColumnId {
  if (task.status === "Completed") {
    return "done";
  }
  if (task.status === "Cancelled") {
    return "todo";
  }
  if (hasOpenWorkLog(task)) {
    return "inProgress";
  }
  const logs = task.employeeWorkLogs ?? [];
  if (logs.length > 0) {
    return "readyToFinalize";
  }
  return "todo";
}

/** Same rules as today view: week stacks now include “ready to finalize” and “done”. */
export function classifyWeekColumn(task: TaskBoardLike): BoardColumnId {
  return classifyTodayColumn(task);
}

/** Local calendar day key YYYY-MM-DD */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDateKey(dateKey: string): { start: Date; end: Date } {
  const [ys, ms, ds] = dateKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start, end };
}

export function getTaskProductionDateKey(task: TaskBoardLike): string | null {
  if (!task.productionDate) return null;
  const d = new Date(task.productionDate);
  if (Number.isNaN(d.getTime())) return null;
  return toLocalDateKey(d);
}

/** Sunday 00:00:00 local for the week that contains `ref`. */
export function getSundayOfWeek(ref: Date): Date {
  const day = ref.getDay();
  const sun = new Date(ref);
  sun.setDate(ref.getDate() - day);
  sun.setHours(0, 0, 0, 0);
  return sun;
}

/** Sun–Thu date keys for the week containing `ref`. */
export function getSunThroughThuKeys(ref: Date): string[] {
  const sun = getSundayOfWeek(ref);
  const keys: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    keys.push(toLocalDateKey(d));
  }
  return keys;
}

/** Inclusive date range for the calendar month containing `ref` (local time). */
export function getMonthRangeKeys(ref: Date): {
  fromKey: string;
  toKey: string;
  dayKeys: string[];
} {
  const y = ref.getFullYear();
  const m0 = ref.getMonth();
  const lastDate = new Date(y, m0 + 1, 0).getDate();
  const dayKeys: string[] = [];
  for (let d = 1; d <= lastDate; d++) {
    dayKeys.push(toLocalDateKey(new Date(y, m0, d)));
  }
  return {
    fromKey: dayKeys[0],
    toKey: dayKeys[dayKeys.length - 1],
    dayKeys,
  };
}

/**
 * Month laid out as Sun–Sat weeks; `null` pads cells outside the month.
 * Each row has exactly 7 entries.
 */
export function getMonthCalendarGrid(ref: Date): (string | null)[][] {
  const y = ref.getFullYear();
  const m0 = ref.getMonth();
  const first = new Date(y, m0, 1);
  const lastDay = new Date(y, m0 + 1, 0).getDate();
  const startDow = first.getDay();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push(toLocalDateKey(new Date(y, m0, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

const COL_RE = /^(todo|inProgress|readyToFinalize|done)$/;

/** Droppable id for day view: `today:<column>` — caller supplies date separately. */
export function droppableIdToday(column: BoardColumnId): string {
  return `today:${column}`;
}

/** Droppable id for week view: `week:<YYYY-MM-DD>:<column>` */
export function droppableIdWeek(dateKey: string, column: BoardColumnId): string {
  return `week:${dateKey}:${column}`;
}

export function parseBoardDroppableId(
  id: string,
): { mode: "today" | "week"; column: BoardColumnId; dateKey: string | null } | null {
  if (id.startsWith("today:")) {
    const col = id.slice(6);
    if (!COL_RE.test(col)) return null;
    return { mode: "today", column: col as BoardColumnId, dateKey: null };
  }
  const m = id.match(/^week:([\d]{4}-[\d]{2}-[\d]{2}):(todo|inProgress|readyToFinalize|done)$/);
  if (!m) return null;
  return {
    mode: "week",
    dateKey: m[1],
    column: m[2] as BoardColumnId,
  };
}
