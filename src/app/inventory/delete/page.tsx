"use client";

import React, { useState, useEffect } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  // add other fields if needed
}

export default function DeleteInventoryItem() {
  const router = useRouter();
  const t = useTranslations("inventory.delete");

  // State to store inventory items
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // The selected item to delete
  const [selectedItem, setSelectedItem] = useState<{value: string; label: string} | null>(null);

  // For success/error messages
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  // Fetch inventory on mount
  useEffect(() => {
    setIsMounted(true);
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => {
        setInventoryItems(data);
      })
      .catch((err) => {
        console.error(t("errorLoadingInventory"), err);
        setErrorMessage(t("errorLoadingInventory"));
      });
  }, [t]);

  // Build react-select options
  const itemOptions = inventoryItems.map((it) => ({
    value: it._id,
    label: it.itemName,
  }));

  // Handle delete
  async function handleDelete() {
    if (!selectedItem) {
      alert(t("noItemSelected"));
      return;
    }

    // Confirm?
    const sure = confirm(t("confirmDelete", { itemName: selectedItem.label }));
    if (!sure) return;

    try {
      // Example: /api/inventory?itemId=xxx
      // or you might do /api/inventory/[itemId]
      const response = await fetch(`/api/inventory?itemId=${selectedItem.value}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("deleteError"));
      }

      // If successful
      setSuccessMessage(t("deleteSuccess", { itemName: selectedItem.label }));
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Error deleting item:", err);
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-md border border-gray-700">
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          {t("back")}
        </button>
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">
          {t("title")}
        </h1>

        {errorMessage && (
          <p className="text-center text-red-400 mb-4">{errorMessage}</p>
        )}

        <div className="flex flex-col gap-4">
          <label className="text-gray-300 font-semibold">
            {t("selectItemLabel")}
          </label>
          {isMounted ? (
            <Select
              options={itemOptions}
              value={selectedItem}
              onChange={(val) => setSelectedItem(val)}
              placeholder={t("selectPlaceholder")}
              styles={{
                control: (provided) => ({ ...provided, backgroundColor: "white" }),
                singleValue: (provided) => ({ ...provided, color: "black" }),
                option: (provided) => ({ ...provided, color: "black" }),
              }}
            />
          ) : (
            <div className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-gray-400">
              {t("loadingItems")}
            </div>
          )}

          <button
            onClick={handleDelete}
            className="mt-4 w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition"
          >
            {t("deleteButton")}
          </button>
        </div>
      </div>

      {showSuccessModal && (
        <SuccessModal
          onClose={() => {
            setShowSuccessModal(false);
            router.push("/"); // or wherever you want to redirect
          }}
          message={successMessage}
        />
      )}
    </div>
  );
}

// A simple success modal
function SuccessModal({
  onClose,
  message,
}: {
  onClose: () => void;
  message: string;
}) {
  const t = useTranslations("inventory.delete"); // or "common"

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">{t("deletedTitle")}</h2>
        <p className="text-center text-gray-800 mb-4">{message}</p>
        <div className="flex justify-center">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={onClose}
          >
            {t("okMessage")}
          </button>
        </div>
      </div>
    </div>
  );
}
