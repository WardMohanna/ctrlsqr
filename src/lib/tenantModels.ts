import { Connection } from "mongoose";
import { inventorySchema } from "@/models/Inventory";
import { InvoiceSchema } from "@/models/Invoice";
import { SupplierSchema } from "@/models/Supplier";
import { AccountSchema } from "@/models/Account";
import { SaleSchema } from "@/models/Sale";
import { CounterSchema } from "@/models/Counters";
import { productionTaskSchema } from "@/models/ProductionTask";
import { PriceIncreaseSchema } from "@/models/PriceIncrease";
import { stockCountOrderSchema } from "@/models/StockCountOrder";
import { EmployeeReportSchema } from "@/models/EmployeeReport";
import { DailyReportSchema } from "@/models/DailyReport";
import { ReportRowSchema } from "@/models/Reports";
import { epicSchema } from "@/models/Epic";

/**
 * Returns Mongoose models bound to a specific tenant's DB connection.
 * Each tenant has its own isolated database — no tenantId filtering needed.
 *
 * Usage:
 *   const db = await getDbForTenant(sessionUser.tenantId);
 *   const { Inventory, Invoice } = getTenantModels(db);
 */
export function getTenantModels(db: Connection) {
  return {
    InventoryItem:  db.models.InventoryItem  ?? db.model("InventoryItem",  inventorySchema),
    Invoice:        db.models.Invoice        ?? db.model("Invoice",        InvoiceSchema),
    Supplier:       db.models.Supplier       ?? db.model("Supplier",       SupplierSchema),
    Account:        db.models.Account        ?? db.model("Account",        AccountSchema),
    Sale:           db.models.Sale           ?? db.model("Sale",           SaleSchema),
    Counters:       db.models.Counters       ?? db.model("Counters",       CounterSchema),
    ProductionTask: db.models.ProductionTask ?? db.model("ProductionTask", productionTaskSchema),
    Epic:           db.models.Epic           ?? db.model("Epic",           epicSchema),
    PriceIncrease:  db.models.PriceIncrease  ?? db.model("PriceIncrease",  PriceIncreaseSchema),
    StockCountOrder:db.models.StockCountOrder?? db.model("StockCountOrder",stockCountOrderSchema),
    EmployeeReport: db.models.EmployeeReport ?? db.model("EmployeeReport", EmployeeReportSchema),
    DailyReport:    db.models.DailyReport    ?? db.model("DailyReport",    DailyReportSchema),
    ReportRow:      db.models.ReportRow      ?? db.model("ReportRow",      ReportRowSchema),
  };
}
