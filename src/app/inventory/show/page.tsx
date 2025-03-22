"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ComponentLine {
  componentId: {
    _id: string;
    itemName: string;
    unit?: string;
    currentCostPrice?: number;
  };
  percentage: number;
  partialCost?: number; // The server-stored partial cost
  quantityUsed?: number; // The usage in grams or whatever unit
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

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => {
        setInventory(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching inventory:", err);
        setError("Failed to load inventory");
        setLoading(false);
      });
  }, []);

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

  // Derived inventory
  const filtered = inventory.filter((item) => matchesSearch(item, searchTerm));
  const sorted = [...filtered].sort(compare);

  // Loading / Error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-center text-black-300">Loading inventory...</p>
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
            ← Back
          </button>

          <input
            type="text"
            className="p-2 border border-blue-300 rounded-lg bg-blue-200 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <h1 className="text-3xl font-bold mb-4 text-center text-gray-100">
          Inventory List
        </h1>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-blue-300">
            <thead className="bg-blue-500 text-black">
              <tr>
                <SortableHeader
                  label="SKU"
                  column="sku"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Item Name"
                  column="itemName"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Category"
                  column="category"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Quantity"
                  column="quantity"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Unit"
                  column="unit"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Cost Price (By Unit)"
                  column="currentCostPrice"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Client Price"
                  column="currentClientPrice"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Business Price"
                  column="currentBusinessPrice"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <th className="border border-blue-300 p-3">BOM</th>
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
                      {item.currentClientPrice !== undefined
                        ? `₪${item.currentClientPrice.toFixed(2)}`
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
                          View BOM
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
                    No matching items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOM Modal */}
      {openBOMItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              onClick={() => setOpenBOMItem(null)}
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-4">
              BOM for {openBOMItem.itemName}
            </h2>

            {/* Show product weight */}
            <div className="mb-4 font-semibold  text-gray-600">
              Product Weight:{" "}
              {openBOMItem.standardBatchWeight
                ? `${openBOMItem.standardBatchWeight} g`
                : "0 g"}
            </div>

            {/* Show each component's details */}
            {openBOMItem.components?.map((comp, i) => {
              const rm = comp.componentId;
              const name = rm?.itemName || "Unknown RM";

              // Percentage
              const pctStr = comp.percentage.toFixed(2);

              // partialCost
              const partialCost = comp.partialCost ?? 0;
              const partialCostDisplay =
                partialCost > 0 ? `₪${partialCost.toFixed(2)}` : "-";

              // quantityUsed
              const used = comp["quantityUsed"] ?? 0;

              return (
                <div key={i} className="mb-3 border-b border-gray-300 pb-2  text-gray-600">
                  <div className="font-semibold">{name}</div>
                  <div className="text-sm text-gray-700">
                    <div>Percentage: {pctStr}%</div>
                    <div>Weight used: {used} g</div>
                    <div>Cost for this portion: {partialCostDisplay}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** 
 * SortableHeader 
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
