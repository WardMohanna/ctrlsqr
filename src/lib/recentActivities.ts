export interface RecentActivity {
  path: string;
  visitedAt: number;
}

const STORAGE_KEY = "ctrlsqr_recent_activities_v1";
const MAX_RECENT_ACTIVITIES = 10;

type RecentActivitiesStore = Record<string, RecentActivity[]>;

function normalizePath(path: string): string {
  const basePath = path.split("?")[0].split("#")[0] ?? "/";
  if (basePath !== "/" && basePath.endsWith("/")) {
    return basePath.slice(0, -1);
  }
  return basePath;
}

function isTrackablePath(path: string): boolean {
  if (!path || path === "/") return false;
  if (path.startsWith("/api")) return false;
  if (path === "/welcomePage") return false;
  if (path === "/mainMenu") return false;
  return true;
}

function readStore(): RecentActivitiesStore {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RecentActivitiesStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: RecentActivitiesStore): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore localStorage write failures.
  }
}

export function addRecentActivity(userId: string, rawPath: string): void {
  if (!userId) return;

  const path = normalizePath(rawPath);
  if (!isTrackablePath(path)) return;

  const store = readStore();
  const current = store[userId] ?? [];

  const updated: RecentActivity[] = [
    { path, visitedAt: Date.now() },
    ...current.filter((activity) => activity.path !== path),
  ].slice(0, MAX_RECENT_ACTIVITIES);

  store[userId] = updated;
  writeStore(store);
}

export function getRecentActivities(
  userId: string,
  limit = MAX_RECENT_ACTIVITIES,
): RecentActivity[] {
  if (!userId) return [];

  const store = readStore();
  const userActivities = (store[userId] ?? []).filter((activity) =>
    isTrackablePath(normalizePath(activity.path)),
  );
  return userActivities.slice(0, Math.max(1, limit));
}
