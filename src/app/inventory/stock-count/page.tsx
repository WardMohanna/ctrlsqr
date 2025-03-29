"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit?: string;
}

interface CountRow extends InventoryItem {
  doCount: boolean;
  newCount: number;
}

interface CategoryGroup {
  category: string;
  items: CountRow[];
}

export default function StockCountAccordion() {
  const router = useRouter();
  const t = useTranslations("inventory.stockcount");

  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion expanded state: e.g. { "ProductionRawMaterial": true, ... }
  const [expanded, setExpanded] = useState<{ [cat: string]: boolean }>({});

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data: InventoryItem[]) => {
        // Convert each item into a CountRow
        const rows: CountRow[] = data.map((item) => ({
          ...item,
          doCount: false,
          newCount: item.quantity,
        }));

        // Group items by category
        const temp: { [category: string]: CountRow[] } = {};
        for (const row of rows) {
          if (!temp[row.category]) {
            temp[row.category] = [];
          }
          temp[row.category].push(row);
        }

        // Transform into an array of groups and sort categories and items
        const groupArray: CategoryGroup[] = Object.keys(temp)
          .sort()
          .map((cat) => {
            temp[cat].sort((a, b) => a.itemName.localeCompare(b.itemName));
            return { category: cat, items: temp[cat] };
          });

        setGroups(groupArray);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading inventory:", err);
        setError(t("errorLoadingInventory"));
        setLoading(false);
      });
  }, [t]);

  /** Toggle expand/collapse for a category */
  function toggleCategory(cat: string) {
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  /** Handle form submission to update stock count */
  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Gather all items the user has selected to count
    const allCounted: { _id: string; newCount: number }[] = [];
    for (const group of groups) {
      for (const row of group.items) {
        if (row.doCount) {
          allCounted.push({ _id: row._id, newCount: row.newCount });
        }
      }
    }

    if (allCounted.length === 0) {
      alert(t("errorNoCountItems"));
      return;
    }

    // POST the updated stock count to the server
    fetch("/api/inventory/stock-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allCounted),
    })
      .then((res) => {
        if (!res.ok) throw new Error(t("errorUpdatingStockCount"));
        return res.json();
      })
      .then(() => {
        alert(t("stockCountUpdatedSuccess"));
        // Optionally, reload or navigate away
      })
      .catch((err) => {
        console.error("Error updating stock count:", err);
        alert(t("errorUpdatingStockCount"));
      });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-gray-300">{t("loadingInventory")}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-4xl border border-gray-700">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          {t("back")}
        </button>

        <h1 className="text-3xl font-bold mb-6 text-center text-gray-100">
          {t("pageTitle")}
        </h1>

        <form onSubmit={handleSubmit}>
          {groups.map((group) => {
            const isOpen = expanded[group.category] || false;
            return (
              <div key={group.category} className="mb-4 border border-gray-700 rounded">
                {/* Category Header */}
                <div
                  onClick={() => toggleCategory(group.category)}
                  className="bg-gray-700 p-3 cursor-pointer flex justify-between items-center"
                >
                  <span className="font-semibold text-gray-200">
                    {t("categoryTitle", { category: group.category })}
                  </span>
                  <span className="text-gray-300">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>

                {/* Collapsible Table */}
                {isOpen && (
                  <table className="w-full border-collapse border border-gray-600 text-gray-200">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="p-3 border border-gray-600">{t("table.count")}</th>
                        <th className="p-3 border border-gray-600">{t("table.itemName")}</th>
                        <th className="p-3 border border-gray-600">{t("table.currentQty")}</th>
                        <th className="p-3 border border-gray-600">{t("table.newCount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((row, idx) => (
                        <tr key={row._id} className="text-center">
                          <td className="p-3 border border-gray-600">
                            <input
                              type="checkbox"
                              checked={row.doCount}
                              onChange={(e) => {
                                const newGroups = [...groups];
                                const itemRef = newGroups.find(
                                  (g) => g.category === group.category
                                )!.items[idx];
                                itemRef.doCount = e.target.checked;
                                setGroups(newGroups);
                              }}
                            />
                          </td>
                          <td className="p-3 border border-gray-600">{row.itemName}</td>
                          <td className="p-3 border border-gray-600">{row.quantity}</td>
                          <td className="p-3 border border-gray-600">
                            <input
                              type="number"
                              className="p-2 border border-gray-500 rounded bg-gray-800 text-white w-20"
                              disabled={!row.doCount}
                              value={row.newCount}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                const newGroups = [...groups];
                                const itemRef = newGroups.find(
                                  (g) => g.category === group.category
                                )!.items[idx];
                                itemRef.newCount = val;
                                setGroups(newGroups);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          <button
            type="submit"
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            {t("submitCount")}
          </button>
        </form>
      </div>
    </div>
  );
}
