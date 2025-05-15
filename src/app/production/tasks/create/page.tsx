"use client";

import React, { useEffect, useState, FormEvent } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import PopupModal from "@/components/popUpModule";

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
}

interface ProductionTask {
  _id: string;
  taskType: string;
  taskName: string;
  product?: {
    _id: string;
    itemName: string;
  };
  plannedQuantity?: number;
  productionDate: string;
  status: "Pending" | "InProgress" | "Completed" | "Cancelled";
  createdAt: string;
}

export default function ProductionTasksPage() {
  const router = useRouter();
  const t = useTranslations("production.create");
  const [popup, setPopup] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [productionTasks, setProductionTasks] = useState<ProductionTask[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [plannedQuantity, setPlannedQuantity] = useState<number>(0);
  const [productionPlannedDate, setProductionPlannedDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const showPopup = (message: string, type: "success" | "error" | "info" = "info") => {
    setPopup({ message, type });
  };
  const closePopup = () => setPopup(null);

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data: InventoryItem[]) => {
        // Filter items by category (FinalProduct or SemiFinalProduct)
        const filtered = data.filter((item) =>
          ["FinalProduct", "SemiFinalProduct"].includes(item.category)
        );
        setInventoryItems(filtered);
      })
      .catch(console.error);

    fetch("/api/production/tasks")
      .then((res) => res.json())
      .then(setProductionTasks)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      alert(t("errorSelectProduct"));
      return;
    }

    if (!plannedQuantity || plannedQuantity <= 0) {
      alert(t("errorValidQuantity"));
      return;
    }

    if (!productionPlannedDate) {
      alert(t("errorSelectDate"));
      return;
    }
    
    // Convert both to timestamps for comparison
    if (new Date(productionPlannedDate).getTime() < new Date().setHours(0, 0, 0, 0)) {
      alert(t("errorPastDate")); // Show an error if date is before today
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        taskType: "Production",
        productionDate: productionPlannedDate,
        product: selectedProduct.value,
        plannedQuantity,
        status: "Pending", // Ensure new tasks start as "Pending"
      };

      const res = await fetch("/api/production/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(t("errorCreatingTask"));

      //alert(t("createTaskSuccess"));
      showPopup(t("createTaskSuccess"),"success");
      setSelectedProduct(null);
      setPlannedQuantity(0);
      setProductionPlannedDate("");

      const updated = await fetch("/api/production/tasks").then((r) => r.json());
      setProductionTasks(updated);
      router.push("/welcomePage");
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  };

  const productOptions = inventoryItems.map((item) => ({
    value: item._id,
    label: item.itemName,
  }));

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center p-6">
      <button
        onClick={() => router.back()}
        className="self-start mb-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
      >
        {t("back")}
      </button>
      
       {popup && (
        <PopupModal
        message={popup.message}
        type={popup.type}
        onClose={closePopup}
      />
       )}

      <h1 className="text-3xl font-bold text-white mb-6">{t("pageTitle")}</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-2xl mb-8"
      >
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">{t("productLabel")}</label>
          <Select
            options={productOptions}
            value={selectedProduct}
            onChange={setSelectedProduct}
            placeholder={t("productPlaceholder")}
            styles={{
              control: (base) => ({
                ...base,
                backgroundColor: "#1f2937",
                borderColor: "#4b5563",
                color: "white",
              }),
              singleValue: (base) => ({ ...base, color: "white" }),
              menu: (base) => ({ ...base, backgroundColor: "#1f2937", color: "white" }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? "#374151" : "#1f2937",
                color: "white",
              }),
            }}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 mb-2">
            {t("plannedQuantityLabel")}
          </label>
          <input
            type="number"
            placeholder={t("plannedQuantityPlaceholder")}   // ← your placeholder text here
            value={plannedQuantity > 0 ? plannedQuantity : ""} // ← show empty when zero
            onChange={(e) =>
              // if they clear it entirely, treat it as 0 again
              setPlannedQuantity(
                e.target.value === "" ? 0 : Math.max(0, Number(e.target.value))
              )
            }
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600"
            min={0}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 mb-2">{t("plannedDateLabel")}</label>
          <input
            type="date"
            value={productionPlannedDate}
            onChange={(e) => setProductionPlannedDate(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600"
            min={new Date().toISOString().split("T")[0]} // Prevent selection of past dates
/>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          {loading ? t("creating") : t("createTask")}
        </button>
      </form>
    </div>
  );
}
