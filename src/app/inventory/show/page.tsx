"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface InventoryItem {
  _id: string;
  sku: string;
  itemName: string;
  category: string;
  quantity: number;
  clientPrice?: number;
  businessPrice?: number;
}

type SortColumn = "sku" | "itemName" | "category" | "quantity" | "clientPrice" | "businessPrice";
type SortDirection = "asc" | "desc";

export default function ShowInventory() {
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("category"); // Default sort: category
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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
      (item.clientPrice ?? "").toString(),
      (item.businessPrice ?? "").toString(),
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
    if (["quantity", "clientPrice", "businessPrice"].includes(sortColumn)) {
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
    // If clicking the same column, toggle direction
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  // ------------------ Derived Inventory ------------------
  const filteredInventory = inventory.filter((item) => matchesSearch(item, searchTerm));
  const sortedInventory = [...filteredInventory].sort(compare);

  // ------------------ Loading / Error States ------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-center text-gray-300">Loading inventory...</p>
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

  // ------------------ Render ------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-5xl border border-gray-700">
        
        {/* Back Button + Search */}
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

        <h1 className="text-3xl font-bold mb-4 text-center text-gray-100">Inventory List</h1>

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
                  label="Client Price"
                  column="clientPrice"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Business Price"
                  column="businessPrice"
                  currentColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedInventory.map((item, index) => {
                // Alternate row colors: lighter blues
                const rowBg = index % 2 === 0 ? "bg-blue-100" : "bg-blue-200";
                return (
                  <tr
                    key={item._id}
                    className={`${rowBg} text-black hover:bg-blue-300 transition-colors text-center`}
                  >
                    <td className="border border-blue-300 p-3">{item.sku}</td>
                    <td className="border border-blue-300 p-3">{item.itemName}</td>
                    <td className="border border-blue-300 p-3">{item.category}</td>
                    <td className="border border-blue-300 p-3">{item.quantity}</td>
                    <td className="border border-blue-300 p-3">
                      {item.clientPrice ? `$${item.clientPrice.toFixed(2)}` : "-"}
                    </td>
                    <td className="border border-blue-300 p-3">
                      {item.businessPrice ? `$${item.businessPrice.toFixed(2)}` : "-"}
                    </td>
                  </tr>
                );
              })}

              {/* If no matching items */}
              {sortedInventory.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center bg-blue-200 text-black p-4">
                    No matching items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Small helper component to show the column label + sort arrow. */
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
  // Show arrow if this column is the one being sorted
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
