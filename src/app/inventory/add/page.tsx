"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import Quagga from "quagga";

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  unit?: string;
  currentCostPrice?: number; // so we can compute partial cost
}

// BOM line in the form
interface ComponentLine {
  componentId: string; // references the raw material's _id
  grams: number;       // user enters grams for 1 standard batch
}

export default function AddInventoryItem() {
  const router = useRouter();

  // Main form data
  const [formData, setFormData] = useState({
    sku: "",
    autoAssignSKU: false,
    barcode: "",
    itemName: "",
    category: null as any, // e.g. { value: "FinalProduct", label: "Final Product" }
    quantity: 0,
    minQuantity: 0,
    currentClientPrice: 0,
    currentBusinessPrice: 0,
    currentCostPrice: 0,
    unit: null as any, // e.g. { value: "grams", label: "Grams (g)" }
    standardBatchWeight: 0,
    components: [] as ComponentLine[],
  });

  // Error states
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // For BOM references
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Barcode scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // NEW: show/hide BOM preview modal
  const [showBOMModal, setShowBOMModal] = useState(false);

  // Fetch existing inventory for BOM references
  useEffect(() => {
    setIsMounted(true);
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => setInventoryItems(data))
      .catch((err) => console.error("Error loading inventory:", err));
  }, []);

  // Category + Unit options
  const categories = [
    { value: "ProductionRawMaterial", label: "Production Raw Material" },
    { value: "CoffeeshopRawMaterial", label: "Coffeeshop Raw Material" },
    { value: "CleaningMaterial", label: "Cleaning Material" },
    { value: "Packaging", label: "Packaging" },
    { value: "DisposableEquipment", label: "Disposable Equipment" },
    { value: "SemiFinalProduct", label: "Semi-Final Product" },
    { value: "FinalProduct", label: "Final Product" },
  ];

  const units = [
    { value: "grams", label: "Grams (g)" },
    { value: "kg", label: "Kilograms (kg)" },
    { value: "ml", label: "Milliliters (ml)" },
    { value: "liters", label: "Liters (L)" },
    { value: "pieces", label: "Pieces" },
  ];

  // BOM raw materials (only items that are ProductionRawMaterial)
  const rawMaterials = inventoryItems
    .filter((i) => i.category === "ProductionRawMaterial")
    .map((i) => ({ value: i._id, label: i.itemName }));

  // Basic input changes
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
      return;
    }

    if (
      [
        "quantity",
        "minQuantity",
        "currentCostPrice",
        "currentClientPrice",
        "currentBusinessPrice",
      ].includes(name)
    ) {
      setFormData({ ...formData, [name]: Number(value) || 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setErrors({ ...errors, [name]: "" });
  }

  // Category select
  function handleCategoryChange(selected: any) {
    setFormData({
      ...formData,
      category: selected,
      components: [],
      standardBatchWeight: 0,
    });
    setErrors({ ...errors, category: "" });
  }

  // Unit select
  function handleUnitChange(selected: any) {
    setFormData({ ...formData, unit: selected });
  }

  // Add a new BOM line
  function handleComponentChange(selected: any) {
    if (!selected) return;
    // Avoid duplicates
    if (formData.components.some((c) => c.componentId === selected.value)) {
      alert("This component is already added!");
      return;
    }
    setFormData({
      ...formData,
      components: [...formData.components, { componentId: selected.value, grams: 0 }],
    });
  }

  // Update grams for a BOM line
  function handleGramsChange(index: number, grams: number) {
    const updated = [...formData.components];
    updated[index].grams = grams;
    setFormData({ ...formData, components: updated });
  }

  // Remove a BOM line
  function handleRemoveLine(index: number) {
    const updated = [...formData.components];
    updated.splice(index, 1);
    setFormData({ ...formData, components: updated });
  }

  // Summation of BOM grams
  const totalBOMGrams = formData.components.reduce((sum, c) => sum + c.grams, 0);

  // Barcode scanning
  function handleScanBarcode() {
    setIsScannerOpen(true);
  }

  useEffect(() => {
    if (!isScannerOpen) return;
    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          constraints: { facingMode: "environment" },
          target: document.querySelector("#interactive"),
        },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "upc_reader", "code_39_reader"],
        },
      },
      (err) => {
        if (err) {
          console.error("Quagga init error:", err);
          return;
        }
        Quagga.start();
      }
    );
    Quagga.onDetected(onDetected);
    return () => {
      Quagga.offDetected(onDetected);
      Quagga.stop();
    };
  }, [isScannerOpen]);

  function onDetected(result: any) {
    const code = result.codeResult.code;
    console.log("Barcode detected:", code);
    setFormData((prev) => ({ ...prev, barcode: code }));
    setIsScannerOpen(false);
  }

  // ------------- BOM PREVIEW --------------
  function handlePreviewBOM() {
    if (!formData.itemName) {
      alert("Please enter an item name first.");
      return;
    }
    if (!formData.standardBatchWeight || formData.standardBatchWeight <= 0) {
      alert("Please enter a valid standard batch weight first.");
      return;
    }
    if (formData.components.length === 0) {
      alert("No components to preview.");
      return;
    }
    setShowBOMModal(true);
  }

  // On submit
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: any = {};

    // Validate SKU
    if (!formData.autoAssignSKU && !formData.sku) {
      newErrors.sku = "SKU is required.";
    }
    // Validate itemName
    if (!formData.itemName) {
      newErrors.itemName = "Item name is required.";
    }
    // Validate category
    if (!formData.category) {
      newErrors.category = "Category is required.";
    }

    const catVal = formData.category?.value;
    if (catVal === "SemiFinalProduct" || catVal === "FinalProduct") {
      if (formData.standardBatchWeight <= 0) {
        newErrors.standardBatchWeight = "Enter a standard batch weight in grams.";
      }
      if (totalBOMGrams !== formData.standardBatchWeight) {
        newErrors.components = `Sum of BOM grams (${totalBOMGrams}) != standardBatchWeight (${formData.standardBatchWeight}).`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // If autoAssignSKU is checked, we auto-generate
    let finalSKU = formData.sku;
    if (formData.autoAssignSKU) {
      finalSKU = "AUTO-SKU-PLACEHOLDER";
    }

    // Convert BOM grams => store both percentage + quantityUsed
    const convertedComponents = formData.components.map((c) => {
      let pct = 0;
      if (catVal === "SemiFinalProduct" || catVal === "FinalProduct") {
        pct = (c.grams / formData.standardBatchWeight) * 100;
      }
      return {
        componentId: c.componentId,
        percentage: pct,
        // We store grams as quantityUsed
        quantityUsed: c.grams,
      };
    });

    // Build final data
    const dataToSend = {
      sku: finalSKU,
      barcode: formData.barcode,
      itemName: formData.itemName,
      category: catVal,
      quantity: formData.quantity,
      minQuantity: formData.minQuantity,
      unit: formData.unit?.value || "",
      currentCostPrice: formData.currentCostPrice,
      currentClientPrice: formData.currentClientPrice,
      currentBusinessPrice: formData.currentBusinessPrice,
      standardBatchWeight: formData.standardBatchWeight,
      components: convertedComponents,
    };

    console.log("Submitting data:", dataToSend);

    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSend),
    });

    const result = await response.json();
    alert(result.message || "Item added!");

    if (response.ok) {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-3xl border border-gray-700">
        
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">
          Add Inventory Item
        </h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SKU + Auto Assign */}
          <div className="col-span-2 flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">
              SKU (Mandatory)
            </label>
            <div className="flex items-center gap-2">
              <input
                className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
                name="sku"
                placeholder="Enter SKU"
                value={formData.sku}
                onChange={handleChange}
                disabled={formData.autoAssignSKU}
              />
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="autoAssignSKU"
                  checked={formData.autoAssignSKU}
                  onChange={handleChange}
                />
                <label className="text-gray-300 text-sm">Auto assign</label>
              </div>
            </div>
            {errors.sku && <p className="text-red-400">{errors.sku}</p>}
          </div>

          {/* Barcode + Scan */}
          <div className="col-span-2 flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">
              Barcode (Optional)
            </label>
            <div className="flex gap-2">
              <input
                className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white w-full"
                name="barcode"
                placeholder="Scan or enter barcode"
                value={formData.barcode}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={handleScanBarcode}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Scan
              </button>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              Item Name
            </label>
            <input
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              name="itemName"
              placeholder="Enter Item Name"
              value={formData.itemName}
              onChange={handleChange}
            />
            {errors.itemName && <p className="text-red-400">{errors.itemName}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              Category
            </label>
            {isMounted ? (
              <Select
                options={categories}
                onChange={handleCategoryChange}
                value={formData.category}
                placeholder="Search & Select Category"
              />
            ) : (
              <div className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-gray-400">
                Loading categories...
              </div>
            )}
            {errors.category && <p className="text-red-400">{errors.category}</p>}
          </div>

          {/* Starting Quantity */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              Starting Quantity
            </label>
            <input
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              type="number"
              name="quantity"
              placeholder="Enter Quantity"
              value={formData.quantity}
              onChange={handleChange}
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              Unit
            </label>
            {isMounted ? (
              <Select
                options={units}
                onChange={handleUnitChange}
                value={formData.unit}
                placeholder="Select Unit"
              />
            ) : (
              <div className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-gray-400">
                Loading units...
              </div>
            )}
          </div>

          {/* Min Quantity */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              Min Quantity
            </label>
            <input
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              type="number"
              name="minQuantity"
              placeholder="Min before alert"
              value={formData.minQuantity}
              onChange={handleChange}
            />
          </div>

          {/* Cost Price for certain categories */}
          {(() => {
            const catVal = formData.category?.value;
            if (
              catVal === "ProductionRawMaterial" ||
              catVal === "CoffeeshopRawMaterial" ||
              catVal === "CleaningMaterial" ||
              catVal === "Packaging" ||
              catVal === "DisposableEquipment"
            ) {
              return (
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
                    name="currentCostPrice"
                    placeholder="Cost per unit"
                    value={formData.currentCostPrice}
                    onChange={handleChange}
                  />
                </div>
              );
            }
            return null;
          })()}

          {/* If Final => show currentBusinessPrice + currentClientPrice */}
          {formData.category?.value === "FinalProduct" && (
            <>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Business Price
                </label>
                <input
                  type="number"
                  className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
                  name="currentBusinessPrice"
                  placeholder="Business Price"
                  value={formData.currentBusinessPrice}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Client Price
                </label>
                <input
                  type="number"
                  className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
                  name="currentClientPrice"
                  placeholder="Client Price"
                  value={formData.currentClientPrice}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {/* If semi/final => BOM */}
          {["SemiFinalProduct", "FinalProduct"].includes(formData.category?.value) && (
            <>
              <div className="md:col-span-2">
                <label className="block text-gray-300 font-semibold mb-1">
                  Standard Batch Weight (g)
                </label>
                <input
                  type="number"
                  className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
                  value={formData.standardBatchWeight}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardBatchWeight: Number(e.target.value),
                    })
                  }
                />
                {errors.standardBatchWeight && (
                  <p className="text-red-400">{errors.standardBatchWeight}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-300">
                  Select Components (BOM – Bill Of Materials)
                </h3>
                <Select
                  options={rawMaterials}
                  onChange={handleComponentChange}
                  placeholder="Search and Select Component"
                  isSearchable
                />
                {errors.components && (
                  <p className="text-red-400">{errors.components}</p>
                )}
                {formData.components.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formData.components.map((comp, idx) => {
                      const item = inventoryItems.find(
                        (inv) => inv._id === comp.componentId
                      );
                      return (
                        <div key={comp.componentId} className="flex items-center gap-4">
                          <span className="text-gray-200">
                            {item?.itemName || "Unknown"}
                          </span>
                          <input
                            type="number"
                            className="p-2 border border-gray-600 rounded-lg w-24 bg-gray-800 text-white"
                            placeholder="Grams"
                            value={comp.grams}
                            onChange={(e) =>
                              handleGramsChange(idx, Number(e.target.value))
                            }
                          />
                          <button
                            className="text-red-400 hover:text-red-600"
                            onClick={() => handleRemoveLine(idx)}
                          >
                            ❌ Remove
                          </button>
                        </div>
                      );
                    })}
                    <p className="text-gray-300">
                      Total BOM grams: {totalBOMGrams}
                    </p>

                    {/* BOM PREVIEW BUTTON */}
                    <button
                      type="button"
                      onClick={handlePreviewBOM}
                      className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                    >
                      Preview BOM
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Submit */}
          <button
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 md:col-span-2"
            type="submit"
          >
            Add Item
          </button>
        </form>
      </div>

      {/* SCANNER MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative w-full max-w-md bg-white rounded shadow-md">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              onClick={() => setIsScannerOpen(false)}
            >
              ✕
            </button>
            <h2 className="text-xl font-bold p-4">Scan Barcode</h2>
            <div id="interactive" className="w-full h-80" />
            <p className="text-center text-sm text-gray-600 p-2">
              Point the camera at a barcode...
            </p>
          </div>
        </div>
      )}

      {/* BOM PREVIEW MODAL */}
      {showBOMModal && (
        <BOMPreviewModal
          onClose={() => setShowBOMModal(false)}
          formData={formData}
          inventoryItems={inventoryItems}
        />
      )}
    </div>
  );
}

// -------------- BOM PREVIEW MODAL --------------
function BOMPreviewModal({
  onClose,
  formData,
  inventoryItems,
}: {
  onClose: () => void;
  formData: {
    itemName: string;
    standardBatchWeight: number;
    components: ComponentLine[];
  };
  inventoryItems: InventoryItem[];
}) {
  const { itemName, standardBatchWeight, components } = formData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md relative max-w-md w-full">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4">
          BOM for {itemName || "N/A"}
        </h2>
        <div className="mb-4">
          <span className="font-semibold">Product Weight: </span>
          {standardBatchWeight} g
        </div>

        {components.length === 0 ? (
          <p>No components.</p>
        ) : (
          <div className="space-y-4">
            {components.map((comp, idx) => {
              const rm = inventoryItems.find((inv) => inv._id === comp.componentId);
              const rmName = rm?.itemName || "Unknown";
              const rmCost = rm?.currentCostPrice ?? 0;

              // fraction
              const fraction = standardBatchWeight
                ? comp.grams / standardBatchWeight
                : 0;
              const percentage = fraction * 100;

              // partial cost approximation (client-side)
              // e.g. cost is "cost per 1g"? We only know "cost per 1 unit" from rmCost
              // If rmCost is "cost per 1 kg," you need to convert grams => kg
              // For simplicity, let's assume rmCost is cost per 1 g
              // or do costPerGram = rmCost / 1000 if rmCost is per kg
              // Adjust as needed
              const costPerGram = rmCost / 1000; 
              const partialCost = costPerGram * comp.grams;

              return (
                <div key={idx} className="border-b border-gray-300 pb-2">
                  <div className="font-semibold">{rmName}</div>
                  <div className="text-sm text-gray-700">
                    <div>Weight Used: {comp.grams} g</div>
                    <div>Percentage: {percentage.toFixed(2)}%</div>
                    <div>
                      Cost for this portion: ₪{partialCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
