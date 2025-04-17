"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface ComponentLine {
  componentId: {
    _id: string;
    itemName: string;
    unit?: string;
    currentCostPrice?: number;
    category: string;  // assume your backend includes category here
  };
  percentage: number;
  partialCost?: number;
  quantityUsed?: number;
}

interface InventoryItem {
  _id: string;
  sku: string;
  itemName: string;
  category: string;
  quantity: number;
  unit?: string;
  currentCostPrice?: number;
  currentClientPrice?: number;
  currentBusinessPrice?: number;
  standardBatchWeight?: number;
  components?: ComponentLine[];
}

type SortColumn =
  | "sku"
  | "itemName"
  | "category"
  | "quantity"
  | "unit"
  | "currentCostPrice"
  | "currentClientPrice"
  | "currentBusinessPrice";

type SortDirection = "asc" | "desc";

export default function ShowInventory() {
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("category");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // For BOM modal
  const [openBOMItem, setOpenBOMItem] = useState<InventoryItem | null>(null);

  // Import translations
  const t = useTranslations("inventory.show");
  const tAdd = useTranslations("inventory.add");

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => {
        setInventory(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching inventory:", err);
        setError(t("errorLoadingInventory"));
        setLoading(false);
      });
  }, [t]);

  // ------------------ Searching ------------------
  function matchesSearch(item: InventoryItem, term: string) {
    const lowerTerm = term.toLowerCase();
    const fields = [
      item.sku.toLowerCase(),
      item.itemName.toLowerCase(),
      item.category.toLowerCase(),
      item.quantity.toString(),
      (item.unit ?? "").toLowerCase(),
      (item.currentCostPrice ?? "").toString(),
      (item.currentClientPrice ?? "").toString(),
      (item.currentBusinessPrice ?? "").toString(),
    ];
    return fields.some((field) => field.includes(lowerTerm));
  }

  // ------------------ Sorting ------------------
  function compare(a: InventoryItem, b: InventoryItem): number {
    let valA: string | number | undefined = a[sortColumn];
    let valB: string | number | undefined = b[sortColumn];

    if (valA === undefined || valA === null) valA = "";
    if (valB === undefined || valB === null) valB = "";

    // Numeric columns
    if (
      ["quantity", "currentCostPrice", "currentClientPrice", "currentBusinessPrice"].includes(
        sortColumn
      )
    ) {
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortDirection === "asc" ? numA - numB : numB - numA;
    }

    // String columns
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    if (strA < strB) return sortDirection === "asc" ? -1 : 1;
    if (strA > strB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  }

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

    // inside ShowInventory(), before the return:
  const totalBOMCost = openBOMItem?.components?.reduce((sum, comp) => {
    const rm = comp.componentId;
    const qty = comp.quantityUsed ?? 0;
    // packaging: unit‑price × qty; else use precomputed partialCost
    const cost = rm.category === "Packaging"
      ? (rm.currentCostPrice ?? 0) * qty
      : comp.partialCost ?? 0;
    return sum + cost;
  }, 0) ?? 0;


  const filtered = inventory.filter((item) => matchesSearch(item, searchTerm));
  const sorted = [...filtered].sort(compare);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-center text-gray-300">{t("loadingInventory")}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-5xl border border-blue-300">
        {/* Back + Search */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            {t("back")}
          </button>

          <input
            type="text"
            className="p-2 border border-blue-300 rounded-lg bg-blue-200 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <h1 className="text-3xl font-bold mb-4 text-center text-gray-100">
          {t("inventoryListTitle")}
        </h1>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-blue-300">
            <thead className="bg-blue-500 text-black">
              <tr>
                <SortableHeader
                  label={t("sku")}
                  column="sku"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("itemName")}
                  column="itemName"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("category")}
                  column="category"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("quantity")}
                  column="quantity"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("unit")}
                  column="unit"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("costPrice")}
                  column="currentCostPrice"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("businessPrice")}
                  column="currentBusinessPrice"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <th className="border border-blue-300 p-3">{t("bom")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => {
                const rowBg = idx % 2 === 0 ? "bg-blue-100" : "bg-blue-200";
                const hasBOM = item.components && item.components.length > 0;
                return (
                  <tr
                    key={item._id}
                    className={`${rowBg} text-black hover:bg-blue-300 transition-colors text-center`}
                  >
                    <td className="border border-blue-300 p-3">{item.sku}</td>
                    <td className="border border-blue-300 p-3">{item.itemName}</td>
                    <td className="border border-blue-300 p-3">{item.category}</td>
                    <td className="border border-blue-300 p-3">{item.quantity}</td>
                    <td className="border border-blue-300 p-3">{item.unit ?? "-"}</td>
                    <td className="border border-blue-300 p-3">
                      {item.currentCostPrice !== undefined
                        ? `₪${item.currentCostPrice.toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="border border-blue-300 p-3">
                      {item.currentBusinessPrice !== undefined
                        ? `₪${item.currentBusinessPrice.toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="border border-blue-300 p-3">
                      {hasBOM ? (
                        <button
                          onClick={() => setOpenBOMItem(item)}
                          className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          {t("viewBOM")}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center bg-blue-200 text-black p-4">
                    {t("noMatchingItems")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* BOM Modal */}
        {openBOMItem && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded shadow-md w-full max-w-lg relative">
              <button
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                onClick={() => setOpenBOMItem(null)}
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-4">
                {t("bomFor")} {openBOMItem.itemName}
              </h2>
              <div className="mb-4 font-semibold text-gray-600 flex gap-4">
              <span>
                {t("productWeight")}:{" "}
                {openBOMItem.standardBatchWeight
                  ? `${openBOMItem.standardBatchWeight} g`
                  : "0 g"}
              </span>
              <span>
                {t("totalCostLabel")}: ₪{totalBOMCost.toFixed(2)}
              </span>
            </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-blue-300">
                      <th className="p-2 border">{tAdd("componentLabel")}</th>
                      <th className="p-2 border">{t("percentage")}</th>
                      <th className="p-2 border">{tAdd("gramsLabel")}</th>
                      <th className="p-2 border">{t("partialCost")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openBOMItem.components?.map((comp, i) => {
                      const rm = comp.componentId;
                      const name = rm.itemName || t("unknownComponent");
                      const qty = comp.quantityUsed ?? 0;
                      const isPackaging = rm.unit === "pieces";
                      // show pcs for packaging, g otherwise
                      const qtyLabel = isPackaging ? `${qty} pcs` : `${qty} g`;
                      // packaging is always 100%
                      const displayPercentage = isPackaging ? 100 : comp.percentage;
                      // if packaging: cost = unit‑price × qty, else use precomputed partialCost
                      const costValue = isPackaging
                        ? (rm.currentCostPrice ?? 0) * qty
                        : comp.partialCost ?? 0;
                      const partialCostDisplay =
                        costValue > 0 ? `₪${costValue.toFixed(2)}` : "-";

                      return (
                        <tr key={i} className="text-gray-700">
                          <td className="p-2 border">{name}</td>
                          <td className="p-2 border">{isPackaging
                            ? "-" 
                            : `${displayPercentage.toFixed(2)}%`}
                          </td> 
                          <td className="p-2 border">{qtyLabel}</td>
                          <td className="p-2 border">{partialCostDisplay}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Reusable SortableHeader
 */
interface SortableHeaderProps {
  label: string;
  column: SortColumn;
  currentColumn: SortColumn;
  direction: SortDirection;
  onSort: (col: SortColumn) => void;
}

function SortableHeader({
  label,
  column,
  currentColumn,
  direction,
  onSort,
}: SortableHeaderProps) {
  const isActive = column === currentColumn;
  const arrow = isActive ? (direction === "asc" ? "▲" : "▼") : "";
  return (
    <th
      className="border border-blue-300 p-3 cursor-pointer hover:bg-blue-500 text-center select-none"
      onClick={() => onSort(column)}
    >
      {label} {arrow && <span className="ml-1">{arrow}</span>}
    </th>
  );
}
