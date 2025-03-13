"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface SnapshotItem {
  _id: string;
  itemName: string;
  category: string;
  costPrice: number;
  snapshotQty: number;
}

export default function SnapshotPage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [data, setData] = useState<SnapshotItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch snapshot from server
  async function handleFetch() {
    if (!date) {
      alert("Please pick a date!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/inventory/snapshot?date=${date}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch snapshot: ${res.status} - ${text}`);
      }
      const results: SnapshotItem[] = await res.json();
      setData(results);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch snapshot");
    }

    setLoading(false);
  }

  // Group items by category
  const grouped = data.reduce((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, SnapshotItem[]>);

  // For each category array, compute sum of (snapshotQty * costPrice)
  let grandTotal = 0;
  const categoryEntries = Object.entries(grouped).map(([cat, items]) => {
    let categoryTotal = 0;
    items.forEach((it) => {
      const subtotal = it.snapshotQty * it.costPrice;
      categoryTotal += subtotal;
    });
    grandTotal += categoryTotal;

    return { category: cat, items, categoryTotal };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-4xl border border-gray-700">
        
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold mb-6 text-center text-gray-100">
          Inventory Snapshot by Date
        </h1>

        {/* Date Picker & Fetch Button */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-gray-300 font-semibold">Pick Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="p-2 border border-gray-600 rounded bg-gray-800 text-white"
          />
          <button
            onClick={handleFetch}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Fetch Snapshot
          </button>
        </div>

        {loading && <p className="text-gray-300">Loading snapshot...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {/* If we have data, show grouped table */}
        {!loading && !error && data.length > 0 && (
          <div className="space-y-8 mt-4">
            {categoryEntries.map(({ category, items, categoryTotal }) => (
              <div key={category} className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-xl font-bold text-gray-100 mb-2">
                  Category: {category}
                </h2>
                <table className="w-full border border-gray-600 text-gray-200">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="p-3 border border-gray-600">Item Name</th>
                      <th className="p-3 border border-gray-600">Qty</th>
                      <th className="p-3 border border-gray-600">CostPrice</th>
                      <th className="p-3 border border-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const subtotal = it.snapshotQty * it.costPrice;
                      return (
                        <tr key={it._id} className="text-center">
                          <td className="p-3 border border-gray-600">{it.itemName}</td>
                          <td className="p-3 border border-gray-600">{it.snapshotQty}</td>
                          <td className="p-3 border border-gray-600">
                            ₪{it.costPrice.toFixed(2)}
                          </td>
                          <td className="p-3 border border-gray-600">
                            ₪{subtotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Category total row */}
                    <tr className="font-semibold text-right bg-gray-700">
                      <td colSpan={3} className="p-3 border border-gray-600">
                        Category Total
                      </td>
                      <td className="p-3 border border-gray-600">
                        ₪{categoryTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            {/* Grand total across all categories */}
            <div className="text-right text-gray-100 font-bold text-xl mt-4">
              Grand Total: ₪{grandTotal.toFixed(2)}
            </div>
          </div>
        )}

        {/* If no data but not loading => probably no items found */}
        {!loading && !error && data.length === 0 && (
          <p className="text-gray-300">No items in snapshot.</p>
        )}
      </div>
    </div>
  );
}
