import type { Session } from "next-auth";
import { connectMongo } from "@/lib/db";
import User from "@/models/User";

/**
 * Session JWT may not always match `User.id` (stale token, edge cases).
 * Resolve the real `id` stored on User — same pattern as login (userName).
 */
export async function resolveCanonicalUserIdFromSession(
  session: Session,
): Promise<string | null> {
  await connectMongo();
  const u = session.user as {
    id?: string;
    name?: string | null;
    lastname?: string | null;
  } | null;
  if (!u) return null;

  if (u.id) {
    const byId = (await User.findOne({ id: String(u.id).trim() })
      .select("id")
      .lean()) as { id?: string } | null;
    if (byId?.id) return byId.id;
  }

  if (u.name != null && u.lastname != null) {
    const userName = `${String(u.name).toLowerCase()}.${String(u.lastname).toLowerCase()}`;
    const byUserName = (await User.findOne({ userName })
      .select("id")
      .lean()) as { id?: string } | null;
    if (byUserName?.id) return byUserName.id;
  }

  return null;
}

export async function validateUserIdsExist(ids: string[]): Promise<boolean> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return true;
  const n = await User.countDocuments({ id: { $in: uniq } });
  return n === uniq.length;
}

/**
 * Attach `createdByUser`, `ownerUser`, `assigneeUsers` for API responses.
 */
export async function enrichTasksWithUsers(tasks: Record<string, unknown>[]) {
  const ids = new Set<string>();
  for (const t of tasks) {
    const c = t.createdBy as string | undefined;
    const o = t.ownerId as string | undefined;
    if (c) ids.add(c);
    if (o) ids.add(o);
    for (const id of (t.assigneeIds as string[] | undefined) || []) {
      if (id) ids.add(id);
    }
  }
  if (ids.size === 0) {
    return tasks.map((t) => ({
      ...t,
      createdByUser: null,
      ownerUser: null,
      assigneeUsers: [],
    }));
  }
  const users = await User.find({ id: { $in: [...ids] } })
    .select("id name lastname userName")
    .lean();
  const map = new Map(users.map((u) => [u.id, u]));
  return tasks.map((t) => ({
    ...t,
    createdByUser: t.createdBy ? map.get(t.createdBy as string) ?? null : null,
    ownerUser: t.ownerId ? map.get(t.ownerId as string) ?? null : null,
    assigneeUsers: ((t.assigneeIds as string[] | undefined) || [])
      .map((id) => map.get(id))
      .filter(Boolean),
  }));
}

export async function enrichSingleTaskWithUsers(task: Record<string, unknown> | null) {
  if (!task) return null;
  const [out] = await enrichTasksWithUsers([task]);
  return out;
}

/**
 * Creator is always the current user. Non-admins may only create tasks for themselves
 * (owner + assignees forced to self).
 */
export async function resolvePeopleForCreate(
  session: Session,
  data: { ownerId?: unknown; assigneeIds?: unknown },
): Promise<
  | { createdBy: string; ownerId: string; assigneeIds: string[] }
  | { error: string }
> {
  const u = session.user;
  if (!u) return { error: "Not authenticated" };
  const role = (u as { role?: string }).role;
  const userId = await resolveCanonicalUserIdFromSession(session);
  if (!userId) {
    return {
      error:
        "Could not match your account to a user record. Try signing out and back in.",
    };
  }
  if (role === "admin" || role === "production_manager") {
    const ownerId =
      typeof data.ownerId === "string" && data.ownerId.trim()
        ? data.ownerId.trim()
        : userId;
    let assigneeIds: string[];
    if (Array.isArray(data.assigneeIds) && data.assigneeIds.length) {
      assigneeIds = [
        ...new Set(
          data.assigneeIds.map((x: unknown) => String(x)).filter(Boolean),
        ),
      ];
    } else {
      assigneeIds = [ownerId];
    }
    const ok = await validateUserIdsExist([ownerId, ...assigneeIds]);
    if (!ok) return { error: "Invalid owner or assignee user id" };
    return { createdBy: userId, ownerId, assigneeIds };
  }
  return { createdBy: userId, ownerId: userId, assigneeIds: [userId] };
}
