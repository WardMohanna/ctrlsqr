/**
 * Tenant filtering utility.
 *
 * SECURITY: Never accept tenantId from the frontend.
 * Always derive it from the authenticated session (JWT).
 */

export type TenantUser = {
  role: string;
  tenantId?: string | null;
};

/**
 * Merges a tenantId constraint into a MongoDB filter object.
 *
 * - super_admin  → filter is returned unchanged (cross-tenant access)
 * - everyone else → { ...filter, tenantId: user.tenantId } is returned
 *
 * Throws if a non-super_admin user has no tenantId (misconfigured account).
 */
export function applyTenantFilter<T extends Record<string, unknown>>(
  filter: T,
  user: TenantUser
): T | (T & { tenantId: string }) {
  if (user.role === "super_admin") {
    return filter;
  }

  if (!user.tenantId) {
    throw new Error("tenantId is missing for a non-super_admin user");
  }

  return { ...filter, tenantId: user.tenantId };
}
