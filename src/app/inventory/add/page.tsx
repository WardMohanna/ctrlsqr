"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import Quagga from "quagga";
import { useTranslations } from "next-intl";

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  unit?: string;
  currentCostPrice?: number;
}

interface ComponentLine {
  componentId: string;
  grams: number;
}

export default function AddInventoryItem() {
  const router = useRouter();
  const t = useTranslations("inventory.add");

  // Main form data
  const [formData, setFormData] = useState({
    sku: "",
    autoAssignSKU: false,
    barcode: "",
    itemName: "",
    category: null as any,
    quantity: 0,
    minQuantity: 0,
    currentClientPrice: 0,
    currentBusinessPrice: 0,
    currentCostPrice: 0,
    unit: null as any,
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

  // BOM preview modal
  const [showBOMModal, setShowBOMModal] = useState(false);

  // Success modal for item added
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch existing inventory for BOM references
  useEffect(() => {
    setIsMounted(true);
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => setInventoryItems(data))
      .catch((err) => console.error(t("errorLoadingInventory"), err));
  }, [t]);

  // Category + Unit options
  const categories = [
    { value: "ProductionRawMaterial", label: t("categoryOptions.productionRawMaterial") },
    { value: "CoffeeshopRawMaterial", label: t("categoryOptions.coffeeshopRawMaterial") },
    { value: "CleaningMaterial", label: t("categoryOptions.cleaningMaterial") },
    { value: "Packaging", label: t("categoryOptions.packaging") },
    { value: "DisposableEquipment", label: t("categoryOptions.disposableEquipment") },
    { value: "SemiFinalProduct", label: t("categoryOptions.semiFinalProduct") },
    { value: "FinalProduct", label: t("categoryOptions.finalProduct") },
  ];

  const units = [
    { value: "grams", label: t("unitOptions.grams") },
    { value: "kg", label: t("unitOptions.kg") },
    { value: "ml", label: t("unitOptions.ml") },
    { value: "liters", label: t("unitOptions.liters") },
    { value: "pieces", label: t("unitOptions.pieces") },
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
      ["quantity", "minQuantity", "currentCostPrice", "currentClientPrice", "currentBusinessPrice"].includes(
        name
      )
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
    if (formData.components.some((c) => c.componentId === selected.value)) {
      alert(t("errorComponentDuplicate"));
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

  // Total BOM grams
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
      (err: any) => {
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

  // BOM PREVIEW
  function handlePreviewBOM() {
    if (!formData.itemName) {
      alert(t("errorNoItemName"));
      return;
    }
    if (!formData.standardBatchWeight || formData.standardBatchWeight <= 0) {
      alert(t("errorInvalidBatchWeight"));
      return;
    }
    if (formData.components.length === 0) {
      alert(t("errorNoComponents"));
      return;
    }
    setShowBOMModal(true);
  }

  // On submit
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: any = {};
    if (!formData.autoAssignSKU && !formData.sku) {
      newErrors.sku = t("errorSKURequired");
    }
    if (!formData.itemName) {
      newErrors.itemName = t("errorItemNameRequired");
    }
    if (!formData.category) {
      newErrors.category = t("errorCategoryRequired");
    }
    const catVal = formData.category?.value;
    if (catVal === "SemiFinalProduct" || catVal === "FinalProduct") {
      if (formData.standardBatchWeight <= 0) {
        newErrors.standardBatchWeight = t("errorBatchWeightRequired");
      }
      if (totalBOMGrams !== formData.standardBatchWeight) {
        newErrors.components = t("errorBOMMismatch", {
          total: totalBOMGrams,
          batch: formData.standardBatchWeight,
        });
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    let finalSKU = formData.sku;
    if (formData.autoAssignSKU) {
      finalSKU = "AUTO-SKU-PLACEHOLDER";
    }
    const convertedComponents = formData.components.map((c) => {
      let pct = 0;
      if (catVal === "SemiFinalProduct" || catVal === "FinalProduct") {
        pct = (c.grams / formData.standardBatchWeight) * 100;
      }
      return {
        componentId: c.componentId,
        percentage: pct,
        quantityUsed: c.grams,
      };
    });
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
    if (response.ok) {
      // Use a localized key from the API response or force our translation
      setSuccessMessage(t(result.messageKey || "itemAddedSuccess"));
      setShowSuccessModal(true);
    } else {
      alert(result.message || t("itemAddedFailure"));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-3xl border border-gray-700">
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          {t("back")}
        </button>
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">
          {t("title")}
        </h1>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SKU + Auto Assign */}
          <div className="col-span-2 flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">
              {t("skuLabel")}
            </label>
            <div className="flex items-center gap-2">
              <input
                className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
                name="sku"
                placeholder={t("skuPlaceholder")}
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
                <label className="text-gray-300 text-sm">{t("autoAssign")}</label>
              </div>
            </div>
            {errors.sku && <p className="text-red-400">{errors.sku}</p>}
          </div>

          {/* Barcode + Scan */}
          <div className="col-span-2 flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">
              {t("barcodeLabel")}
            </label>
            <div className="flex gap-2">
              <input
                className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white w-full"
                name="barcode"
                placeholder={t("barcodePlaceholder")}
                value={formData.barcode}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={handleScanBarcode}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                {t("scan")}
              </button>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              {t("itemNameLabel")}
            </label>
            <input
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              name="itemName"
              placeholder={t("itemNamePlaceholder")}
              value={formData.itemName}
              onChange={handleChange}
            />
            {errors.itemName && <p className="text-red-400">{errors.itemName}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              {t("categoryLabel")}
            </label>
            {isMounted ? (
              <Select
                options={categories}
                onChange={handleCategoryChange}
                value={formData.category}
                placeholder={t("categoryPlaceholder")}
                styles={{
                  singleValue: (provided) => ({ ...provided, color: "black" }),
                  option: (provided) => ({ ...provided, color: "black" }),
                }}
              />
            ) : (
              <div className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-gray-400">
                {t("loadingCategories")}
              </div>
            )}
            {errors.category && <p className="text-red-400">{errors.category}</p>}
          </div>

          {/* Starting Quantity */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              {t("quantityLabel")}
            </label>
            <input
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              type="number"
              name="quantity"
              placeholder={t("quantityPlaceholder")}
              value={formData.quantity}
              onChange={handleChange}
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              {t("unitLabel")}
            </label>
            {isMounted ? (
              <Select
                options={units}
                onChange={handleUnitChange}
                value={formData.unit}
                placeholder={t("unitPlaceholder")}
                styles={{
                  singleValue: (provided) => ({ ...provided, color: "black" }),
                  option: (provided) => ({ ...provided, color: "black", backgroundColor: "white" }),
                  control: (provided) => ({ ...provided, backgroundColor: "white" }),
                }}
              />
            ) : (
              <div className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-gray-400">
                {t("loadingUnits")}
              </div>
            )}
          </div>

          {/* Min Quantity */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              {t("minQuantityLabel")}
            </label>
            <input
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              type="number"
              name="minQuantity"
              placeholder={t("minQuantityPlaceholder")}
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
                    {t("costPriceLabel")}
                  </label>
                  <input
                    type="number"
                    className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
                    name="currentCostPrice"
                    placeholder={t("costPricePlaceholder")}
                    value={formData.currentCostPrice}
                    onChange={handleChange}
                  />
                </div>
              );
            }
            return null;
          })()}

          {/* If Final => show Business Price + Client Price */}
          {formData.category?.value === "FinalProduct" && (
            <>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  {t("businessPriceLabel")}
                </label>
                <input
                  type="number"
                  className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
                  name="currentBusinessPrice"
                  placeholder={t("businessPricePlaceholder")}
                  value={formData.currentBusinessPrice}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  {t("clientPriceLabel")}
                </label>
                <input
                  type="number"
                  className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
                  name="currentClientPrice"
                  placeholder={t("clientPricePlaceholder")}
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
                  {t("standardBatchWeightLabel")}
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

              <div className="md:col-span-2 p-4 bg-gray-800 rounded-lg border border-gray-600 mt-2">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">
                  {t("bomTitle")}
                </h3>

                {/* Add new material row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <Select
                      options={rawMaterials}
                      onChange={handleComponentChange}
                      placeholder={t("bomSelectPlaceholder")}
                      isSearchable
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          backgroundColor: "white",
                        }),
                        singleValue: (provided) => ({
                          ...provided,
                          color: "black",
                        }),
                        option: (provided) => ({
                          ...provided,
                          color: "black",
                          backgroundColor: "white",
                        }),
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-400">
                    {t("bomAddMaterialNote")}
                  </p>
                </div>

                {errors.components && (
                  <p className="text-red-400 mb-2">{errors.components}</p>
                )}

                {formData.components.length > 0 && (
                  <div>
                    <table className="w-full border border-gray-700 text-gray-200 mb-4">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="p-2 border border-gray-600">
                            {t("componentLabel")}
                          </th>
                          <th className="p-2 border border-gray-600">
                            {t("gramsLabel")}
                          </th>
                          <th className="p-2 border border-gray-600">
                            {t("actionLabel")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.components.map((comp, idx) => {
                          const item = inventoryItems.find(
                            (inv) => inv._id === comp.componentId
                          );
                          return (
                            <tr key={comp.componentId} className="text-center">
                              <td className="p-2 border border-gray-600 text-gray-200">
                                {item?.itemName || t("unknownComponent")}
                              </td>
                              <td className="p-2 border border-gray-600">
                                <input
                                  type="number"
                                  className="w-24 p-2 border border-gray-600 rounded bg-gray-900 text-gray-100 text-center"
                                  placeholder={t("gramsPlaceholder")}
                                  value={comp.grams}
                                  onChange={(e) =>
                                    handleGramsChange(idx, Number(e.target.value))
                                  }
                                />
                              </td>
                              <td className="p-2 border border-gray-600">
                                <button
                                  className="text-white hover:text-red-600"
                                  onClick={() => handleRemoveLine(idx)}
                                >
                                  {t("removeBOMProduct")}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <p className="text-gray-300 mb-3">
                      {t("totalBOMGramsLabel", { bomtotal: totalBOMGrams.toString() })}
                    </p>

                    <button
                      type="button"
                      onClick={handlePreviewBOM}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                    >
                      {t("bomPreview")}
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
            {t("submit")}
          </button>
        </form>
      </div>

      {/* SCANNER MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-black bg-opacity-75 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md sm:max-w-lg md:max-w-xl p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 focus:outline-none"
              onClick={() => setIsScannerOpen(false)}
            >
              ✕
            </button>
            <h2 className="text-xl sm:text-2xl font-bold mb-4">{t("scanBarcodeTitle")}</h2>
            <div id="interactive" className="w-full h-80" />
            <p className="text-center text-sm text-gray-600 mt-4">
              {t("scanInstructions")}
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

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-black bg-opacity-75 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md sm:max-w-lg md:max-w-xl p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 focus:outline-none"
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/");
              }}
            >
              ✕
            </button>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center">
              {t("itemAddedSuccess")}
            </h2>
            <p className="mb-4 text-center text-gray-700">{successMessage}</p>
            <div className="flex justify-center">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push("/");
                }}
              >
                {t("okMessage")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// BOM PREVIEW MODAL - Responsive table layout
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
  const t = useTranslations("inventory.add");

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-black bg-opacity-75 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl p-6 relative">
        {/* Close Button */}
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 focus:outline-none"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Modal Title */}
        <h2 className="text-xl sm:text-2xl font-bold mb-4">
          {t("bomFor")} {itemName || t("nA")}
        </h2>

        {/* Standard Batch Weight */}
        <div className="mb-4">
          <span className="font-semibold">{t("productWeightLabel")}: </span>
          {standardBatchWeight} g
        </div>

        {/* BOM Table */}
        {components.length === 0 ? (
          <p className="text-gray-700">{t("noComponents")}</p>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full border border-gray-300 text-gray-800">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border-b border-gray-300">
                    {t("componentLabel")}
                  </th>
                  <th className="py-2 px-4 border-b border-gray-300">
                    {t("weightUsed")}
                  </th>
                  <th className="py-2 px-4 border-b border-gray-300">
                    {t("percentage")}
                  </th>
                  <th className="py-2 px-4 border-b border-gray-300">
                    {t("partialCost")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {components.map((comp, idx) => {
                  const rm = inventoryItems.find(
                    (inv) => inv._id === comp.componentId
                  );
                  const rmName = rm?.itemName || t("unknownComponent");
                  const rmCost = rm?.currentCostPrice ?? 0;
                  const fraction = standardBatchWeight
                    ? comp.grams / standardBatchWeight
                    : 0;
                  const percentage = fraction * 100;
                  const costPerGram = rmCost / 1000;
                  const partialCost = costPerGram * comp.grams;

                  return (
                    <tr key={idx} className="text-sm border-b border-gray-200">
                      <td className="py-2 px-4">
                        <span className="font-semibold">{rmName}</span>
                      </td>
                      <td className="py-2 px-4 text-center">
                        {comp.grams} g
                      </td>
                      <td className="py-2 px-4 text-center">
                        {percentage.toFixed(2)}%
                      </td>
                      <td className="py-2 px-4 text-center">
                        ₪{partialCost.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
