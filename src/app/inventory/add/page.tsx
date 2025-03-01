"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import Quagga from "quagga";

// Basic interface for raw materials from /api/inventory
interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  unit?: string;
}

// BOM line in the form
interface ComponentLine {
  componentId: string;
  grams: number;
}

export default function AddInventoryItem() {
  const router = useRouter();

  // The entire form data
  const [formData, setFormData] = useState({
    sku: "",
    autoAssignSKU: false,
    barcode: "",
    itemName: "",
    category: null as any, // Will store { value, label }
    quantity: 0,
    minQuantity: 0,
    clientPrice: 0,
    businessPrice: 0,
    costPrice: 0,
    unit: null as any, // Will store { value, label }
    standardBatchWeight: 0, // For semi/final BOM
    components: [] as ComponentLine[],
  });

  // For displaying errors (SKU required, etc.)
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // We'll fetch the existing inventory items to let the user pick raw materials for BOM
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Whether the scanner modal is open
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // On mount, fetch the current inventory for BOM references
  useEffect(() => {
    setIsMounted(true);
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => setInventoryItems(data))
      .catch((err) => console.error("Error loading inventory:", err));
  }, []);

  // ----------------------------------------------
  // FULL CATEGORIES ARRAY (no placeholders):
  // ----------------------------------------------
  const categories = [
    { value: "ProductionRawMaterial", label: "Production Raw Material" },
    { value: "CoffeeshopRawMaterial", label: "Coffeeshop Raw Material" },
    { value: "CleaningMaterial", label: "Cleaning Material" },
    { value: "Packaging", label: "Packaging" },
    { value: "DisposableEquipment", label: "Disposable Equipment" },
    { value: "SemiFinalProduct", label: "Semi-Final Product" },
    { value: "FinalProduct", label: "Final Product" },
  ];

  // ----------------------------------------------
  // FULL UNITS ARRAY (no placeholders):
  // ----------------------------------------------
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

  // Basic input changes (for text, number, checkboxes)
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      // For autoAssignSKU
      setFormData({ ...formData, [name]: checked });
      return;
    }

    // If these fields are numeric
    if (["quantity", "minQuantity", "costPrice", "clientPrice", "businessPrice"].includes(name)) {
      setFormData({ ...formData, [name]: Number(value) || 0 });
    } else {
      // Otherwise it's a string field (sku, itemName, barcode, etc.)
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

  // Add a new BOM line (raw material)
  function handleComponentChange(selected: any) {
    if (!selected) return;
    // Check if we already added it
    if (formData.components.some((c) => c.componentId === selected.value)) {
      alert("This component is already added!");
      return;
    }
    setFormData({
      ...formData,
      components: [...formData.components, { componentId: selected.value, grams: 0 }],
    });
  }

  // Update the grams for a specific BOM line
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

  // When user clicks "Scan" for the barcode
  function handleScanBarcode() {
    setIsScannerOpen(true);
  }

  // Quagga setup: when the scanner modal opens
  useEffect(() => {
    if (!isScannerOpen) return;

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          constraints: {
            facingMode: "environment",
          },
          target: document.querySelector("#interactive"), // attach camera feed here
        },
        decoder: {
          // Which barcode types to decode
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

  // On Quagga detection
  function onDetected(result: any) {
    const code = result.codeResult.code;
    console.log("Barcode detected:", code);

    // Fill the form
    setFormData((prev) => ({ ...prev, barcode: code }));

    // Close scanner
    setIsScannerOpen(false);
  }

  // On submit
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: any = {};

    // If user didn't check autoAssignSKU, SKU must be typed
    if (!formData.autoAssignSKU && !formData.sku) {
      newErrors.sku = "SKU is required.";
    }
    if (!formData.itemName) {
      newErrors.itemName = "Item name is required.";
    }
    if (!formData.category) {
      newErrors.category = "Category is required.";
    }

    // If it's SemiFinal or Final, we require standardBatchWeight & BOM sum
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

    // If autoAssignSKU is checked, we set a placeholder for the server to auto-generate
    let finalSKU = formData.sku;
    if (formData.autoAssignSKU) {
      finalSKU = "AUTO-SKU-PLACEHOLDER";
    }

    // Convert BOM grams => percentages
    const convertedComponents = formData.components.map((c) => {
      let pct = 0;
      if (catVal === "SemiFinalProduct" || catVal === "FinalProduct") {
        pct = (c.grams / formData.standardBatchWeight) * 100;
      }
      return {
        componentId: c.componentId,
        percentage: pct,
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
      costPrice: formData.costPrice,
      clientPrice: formData.clientPrice,
      businessPrice: formData.businessPrice,
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
      router.push("/inventory/show");
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
                <label className="text-gray-300 text-sm">
                  Auto assign
                </label>
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
            <label className="block text-gray-300 font-semibold mb-1">Item Name</label>
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
            <label className="block text-gray-300 font-semibold mb-1">Category</label>
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
            <label className="block text-gray-300 font-semibold mb-1">Unit</label>
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

          {/* costPrice if raw or other categories */}
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
                    name="costPrice"
                    placeholder="Cost per unit"
                    value={formData.costPrice}
                    onChange={handleChange}
                  />
                </div>
              );
            }
            return null;
          })()}

          {/* If Final => show clientPrice + businessPrice */}
          {formData.category?.value === "FinalProduct" && (
            <>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Business Price
                </label>
                <input
                  type="number"
                  className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
                  name="businessPrice"
                  placeholder="Business Price"
                  value={formData.businessPrice}
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
                  name="clientPrice"
                  placeholder="Client Price"
                  value={formData.clientPrice}
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
            {/* Quagga uses this <div id="interactive" /> to render the camera feed */}
            <div id="interactive" className="w-full h-80" />
            <p className="text-center text-sm text-gray-600 p-2">
              Point the camera at a barcode...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
