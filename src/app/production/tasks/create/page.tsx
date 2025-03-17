"use client";

import React, { useEffect, useState, FormEvent } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
}

interface ProductionTask {
  _id: string;
  product: {
    _id: string;
    itemName: string;
  };
  plannedQuantity: number;
  productionDate: string; // ISO date string
  status: "Pending" | "InProgress" | "Completed" | "Cancelled";
  createdAt: string;
}

export default function ProductionTasksPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [productionTasks, setProductionTasks] = useState<ProductionTask[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [plannedQuantity, setPlannedQuantity] = useState<number>(0);
  const [productionPlannedDate, setProductionPlannedDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // Fetch inventory items from the server and filter for Final/Semi Final products.
  const fetchInventoryItems = async () => {
    try {
      const res = await fetch("/api/inventory");
      const data: InventoryItem[] = await res.json();
      const filtered = data.filter(
        (item) =>
          item.category === "FinalProduct" ||
          item.category === "SemiFinalProduct"
      );
      setInventoryItems(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch existing production tasks from the correct endpoint.
  const fetchProductionTasks = async () => {
    try {
      const res = await fetch("/api/production/tasks");
      const data: ProductionTask[] = await res.json();
      setProductionTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInventoryItems();
    fetchProductionTasks();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      alert("Please select a product.");
      return;
    }
    if (!plannedQuantity || plannedQuantity <= 0) {
      alert("Please enter a valid planned quantity.");
      return;
    }
    if (!productionPlannedDate) {
      alert("Please select a production planned date.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        product: selectedProduct.value,
        plannedQuantity,
        productionDate: productionPlannedDate,
      };
      // Call the correct endpoint for creating production tasks.
      const res = await fetch("/api/production/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to create production task");
      }
      alert("Production task created successfully!");
      // Reset the form fields
      setSelectedProduct(null);
      setPlannedQuantity(0);
      setProductionPlannedDate("");
      // Refresh the list of production tasks
      fetchProductionTasks();
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Prepare react-select options from inventoryItems.
  const productOptions = inventoryItems.map((item) => ({
    value: item._id,
    label: item.itemName,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center p-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="self-start mb-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold text-white mb-6">
        Create Production Task
      </h1>
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-2xl mb-8"
      >
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Product</label>
          <Select
            options={productOptions}
            value={selectedProduct}
            onChange={setSelectedProduct}
            placeholder="Select a Final or Semi Final Product"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Planned Quantity</label>
          <input
            type="number"
            value={plannedQuantity}
            onChange={(e) => setPlannedQuantity(Number(e.target.value))}
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600"
            placeholder="Enter planned quantity"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">
            Production Planned Date
          </label>
          <input
            type="date"
            value={productionPlannedDate}
            onChange={(e) => setProductionPlannedDate(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600"
          />
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          {loading ? "Creating Task..." : "Create Task"}
        </button>
      </form>

      <h2 className="text-2xl font-bold text-white mb-4">
        Existing Production Tasks
      </h2>
      {productionTasks.length === 0 ? (
        <p className="text-gray-300">No production tasks created yet.</p>
      ) : (
        <div className="w-full max-w-4xl bg-gray-900 rounded-lg shadow-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-600">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-gray-300">Product</th>
                <th className="px-4 py-2 text-gray-300">Planned Quantity</th>
                <th className="px-4 py-2 text-gray-300">Planned Date</th>
                <th className="px-4 py-2 text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-700">
              {productionTasks.map((task) => (
                <tr key={task._id}>
                  <td className="px-4 py-2 text-white">
                    {task.product.itemName}
                  </td>
                  <td className="px-4 py-2 text-white">{task.plannedQuantity}</td>
                  <td className="px-4 py-2 text-white">
                    {task.productionDate.slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-white">{task.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
