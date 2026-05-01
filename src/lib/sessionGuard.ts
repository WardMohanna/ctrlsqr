/**
 * Server-side auth helpers for Next.js App Router API routes.
 *
 * Usage inside a route handler:
 *
 *   const user = await getSessionUser();
 *   const forbidden = requireRole(user, "super_admin");
 *   if (forbidden) return forbidden;
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

export type SessionUser = {
  id: string;
  role: string;
  tenantId: string | null;
  name?: string;
  lastname?: string;
};

/**
 * Reads the authenticated user from the current server-side session.
 * Returns null when there is no valid session.
 *
 * SECURITY: tenantId is always read from the JWT — never from request body / query params.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  return {
    id: session.user.id,
    role: session.user.role ?? "user",
    tenantId: session.user.tenantId ?? null,
    name: session.user.name ?? undefined,
    lastname: (session.user as any).lastname ?? undefined,
  };
}

/**
 * Returns a 401 response when the user is not authenticated,
 * or null when the user is authenticated.
 */
export function requireAuth(
  user: SessionUser | null
): NextResponse | null {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Returns a 403 response when the user does not have the required role,
 * or null when the check passes.
 */
export function requireRole(
  user: SessionUser | null,
  ...allowedRoles: string[]
): NextResponse | null {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
