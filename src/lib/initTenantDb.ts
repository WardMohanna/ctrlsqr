import { getDbForTenant } from "./db";
import { getTenantModels } from "./tenantModels";

/**
 * Initializes a new tenant's database by creating all collections and their indexes.
 * Call this immediately after creating a new Tenant record.
 *
 * MongoDB creates the DB lazily on first write, but calling createIndexes()
 * ensures all collections and indexes exist before any user data is written.
 */
export async function initTenantDb(tenantId: string): Promise<void> {
  const db = await getDbForTenant(tenantId);
  const models = getTenantModels(db);

  await Promise.all(
    Object.values(models).map((model) => model.createIndexes()),
  );
}
