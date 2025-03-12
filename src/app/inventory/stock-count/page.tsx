"use client";

import React, { useEffect, useState, FormEvent } from "react";

/** Basic shape of items from /api/inventory */
interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit?: string;
}

/** We’ll extend each item with doCount + newCount for the counting UI */
interface CountRow extends InventoryItem {
  doCount: boolean;
  newCount: number;
}

/** Data structure for grouping items by category */
interface CategoryGroup {
  category: string;
  items: CountRow[];
}

export default function StockCountAccordion() {
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion “expanded” state: { "ProductionRawMaterial": true, ... }
  const [expanded, setExpanded] = useState<{ [cat: string]: boolean }>({});

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data: InventoryItem[]) => {
        // Convert to CountRow & sort if needed
        const rows: CountRow[] = data.map((item) => ({
          ...item,
          doCount: false,
          newCount: item.quantity,
        }));

        // Group by category using an object
        const temp: { [category: string]: CountRow[] } = {};
        for (const row of rows) {
          if (!temp[row.category]) {
            temp[row.category] = [];
          }
          temp[row.category].push(row);
        }

        // Transform into an array of { category, items }
        // and optionally sort categories & itemName
        const groupArray: CategoryGroup[] = Object.keys(temp)
          .sort() // sorts category names alphabetically
          .map((cat) => {
            // sort items within category by itemName
            temp[cat].sort((a, b) => a.itemName.localeCompare(b.itemName));
            return { category: cat, items: temp[cat] };
          });

        setGroups(groupArray);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading inventory:", err);
        setError("Failed to load inventory");
        setLoading(false);
      });
  }, []);

  /** Toggle expand/collapse for a given category */
  function toggleCategory(cat: string) {
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  /** Handle final submit to /api/inventory/stock-count */
  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Gather all items user decided to count
    // across all categories
    const allCounted = [];
    for (const group of groups) {
      for (const row of group.items) {
        if (row.doCount) {
          allCounted.push({ _id: row._id, newCount: row.newCount });
        }
      }
    }

    if (allCounted.length === 0) {
      alert("No items selected for counting!");
      return;
    }

    // POST to stock-count endpoint
    fetch("/api/inventory/stock-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allCounted),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update stock count");
        return res.json();
      })
      .then(() => {
        alert("Stock count updated successfully!");
        // Optionally reload or navigate away
      })
      .catch((err) => {
        console.error("Error updating stock count:", err);
        alert("Error updating stock count");
      });
  }

  /** If loading or error, show that first */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-gray-300">Loading inventory...</p>
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
          ← Back
        </button>

        <h1 className="text-3xl font-bold mb-6 text-center text-gray-100">
          Stock Count (Accordion by Category)
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
                    {group.category}
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
                        <th className="p-3 border border-gray-600">Count?</th>
                        <th className="p-3 border border-gray-600">Item Name</th>
                        <th className="p-3 border border-gray-600">Current Qty</th>
                        <th className="p-3 border border-gray-600">New Count</th>
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
                                // update doCount in state
                                const newGroups = [...groups];
                                const itemRef = newGroups
                                  .find((g) => g.category === group.category)!
                                  .items[idx];
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
                                const itemRef = newGroups
                                  .find((g) => g.category === group.category)!
                                  .items[idx];
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
            Submit Count
          </button>
        </form>
      </div>
    </div>
  );
}
