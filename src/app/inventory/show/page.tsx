"use client";

import React, { useEffect, useState } from "react";

interface InventoryItem {
  _id: string;
  sku: string;
  itemName: string;
  category: string;
  quantity: number;
  clientPrice?: number;
  businessPrice?: number;
}

export default function ShowInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <p className="text-center text-gray-600">Loading inventory...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">Inventory List</h1>
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-5xl">
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="border border-gray-300 p-3">SKU</th>
              <th className="border border-gray-300 p-3">Item Name</th>
              <th className="border border-gray-300 p-3">Category</th>
              <th className="border border-gray-300 p-3">Quantity</th>
              <th className="border border-gray-300 p-3">Client Price</th>
              <th className="border border-gray-300 p-3">Business Price</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item._id} className="text-center bg-white hover:bg-gray-100">
                <td className="border border-gray-300 p-3">{item.sku}</td>
                <td className="border border-gray-300 p-3">{item.itemName}</td>
                <td className="border border-gray-300 p-3">{item.category}</td>
                <td className="border border-gray-300 p-3">{item.quantity}</td>
                <td className="border border-gray-300 p-3">
                  {item.clientPrice ? `$${item.clientPrice.toFixed(2)}` : "-"}
                </td>
                <td className="border border-gray-300 p-3">
                  {item.businessPrice ? `$${item.businessPrice.toFixed(2)}` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
