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

  // Main form data – numeric fields as strings now
  const [formData, setFormData] = useState({
    sku: "",
    autoAssignSKU: false,
    barcode: "",
    itemName: "",
    category: null as any,
    quantity: "",
    minQuantity: "",
    currentClientPrice: "",
    currentBusinessPrice: "",
    currentCostPrice: "",
    unit: null as any,
    standardBatchWeight: "",
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
    { value: "ProductionRawMaterial", label: t("categoryOptions.ProductionRawMaterial") },
    { value: "CoffeeshopRawMaterial", label: t("categoryOptions.CoffeeshopRawMaterial") },
    { value: "CleaningMaterial", label: t("categoryOptions.CleaningMaterial") },
    { value: "Packaging", label: t("categoryOptions.Packaging") },
    { value: "DisposableEquipment", label: t("categoryOptions.DisposableEquipment") },
    { value: "SemiFinalProduct", label: t("categoryOptions.SemiFinalProduct") },
    { value: "FinalProduct", label: t("categoryOptions.FinalProduct") },
  ];

  const units = [
    { value: "grams", label: t("unitOptions.grams") },
    { value: "kg", label: t("unitOptions.kg") },
    { value: "ml", label: t("unitOptions.ml") },
    { value: "liters", label: t("unitOptions.liters") },
    { value: "pieces", label: t("unitOptions.pieces") },
  ];

  // BOM raw materials: include ProductionRawMaterial + Packaging
  const rawMaterials = inventoryItems
    .filter((i) => ["ProductionRawMaterial", "Packaging"].includes(i.category))
    .map((i) => ({ value: i._id, label: i.itemName }));

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
      setErrors({ ...errors, [name]: "" });
    }
  }

  function handleCategoryChange(selected: any) {
    setFormData({ ...formData, category: selected, components: [], standardBatchWeight: "" });
    setErrors({ ...errors, category: "" });
  }

  function handleUnitChange(selected: any) {
    setFormData({ ...formData, unit: selected });
  }

  // Add a new BOM line; default grams=1 for Packaging
  function handleComponentChange(selected: any) {
    if (!selected) return;
    if (formData.components.some((c) => c.componentId === selected.value)) {
      alert(t("errorComponentDuplicate"));
      return;
    }
    const isPackaging = inventoryItems.find((i) => i._id === selected.value)?.category === "Packaging";
    setFormData({
      ...formData,
      components: [
        ...formData.components,
        { componentId: selected.value, grams: isPackaging ? 1 : 0 },
      ],
    });
  }

  function handleGramsChange(index: number, grams: number) {
    const updated = [...formData.components];
    updated[index].grams = grams;
    setFormData({ ...formData, components: updated });
  }

  function handleRemoveLine(index: number) {
    const updated = [...formData.components];
    updated.splice(index, 1);
    setFormData({ ...formData, components: updated });
  }

  // Sum only raw-material grams
  const totalBOMGrams = formData.components.reduce((sum, c) => {
    const item = inventoryItems.find((i) => i._id === c.componentId);
    return item?.category === "Packaging" ? sum : sum + c.grams;
  }, 0);

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
    setFormData((prev) => ({ ...prev, barcode: code }));
    setIsScannerOpen(false);
  }

  function handlePreviewBOM() {
    if (!formData.itemName) {
      alert(t("errorNoItemName"));
      return;
    }
    if (!formData.standardBatchWeight || Number(formData.standardBatchWeight) <= 0) {
      alert(t("errorInvalidBatchWeight"));
      return;
    }
    if (formData.components.length === 0) {
      alert(t("errorNoComponents"));
      return;
    }
    setShowBOMModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: any = {};

    if (!formData.autoAssignSKU && !formData.sku) newErrors.sku = t("errorSKURequired");
    if (!formData.itemName) newErrors.itemName = t("errorItemNameRequired");
    if (!formData.category) newErrors.category = t("errorCategoryRequired");

    const catVal = formData.category?.value;
    if (["SemiFinalProduct", "FinalProduct"].includes(catVal!)) {
      if (!formData.standardBatchWeight || Number(formData.standardBatchWeight) <= 0) {
        newErrors.standardBatchWeight = t("errorBatchWeightRequired");
      }
      if (totalBOMGrams !== Number(formData.standardBatchWeight)) {
        newErrors.components = t("errorBOMMismatch", {
          total: totalBOMGrams,
          batch: formData.standardBatchWeight,
        });
      }
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    let finalSKU = formData.sku;
    if (formData.autoAssignSKU) finalSKU = "AUTO-SKU-PLACEHOLDER";

    const convertedComponents = formData.components.map((c) => {
      let pct = 0;
      const batchWeight = Number(formData.standardBatchWeight) || 0;
      if (["SemiFinalProduct", "FinalProduct"].includes(catVal!)) {
        pct = (c.grams / batchWeight) * 100;
      }
      return { componentId: c.componentId, percentage: pct, quantityUsed: c.grams };
    });

    const dataToSend = {
      sku: finalSKU,
      barcode: formData.barcode,
      itemName: formData.itemName,
      category: catVal,
      quantity: Number(formData.quantity) || 0,
      minQuantity: Number(formData.minQuantity) || 0,
      unit: formData.unit?.value || "",
      currentCostPrice: Number(formData.currentCostPrice) || 0,
      currentClientPrice: Number(formData.currentClientPrice) || 0,
      currentBusinessPrice: Number(formData.currentBusinessPrice) || 0,
      standardBatchWeight: Number(formData.standardBatchWeight) || 0,
      components: convertedComponents,
    };

    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSend),
    });
    const result = await response.json();
    if (response.ok) {
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
              step="any"
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
              step="any"
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
              ["ProductionRawMaterial", "CoffeeshopRawMaterial", "CleaningMaterial", "Packaging", "DisposableEquipment"].includes(
                catVal!
              )
            ) {
              return (
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    {t("costPriceLabel")}
                  </label>
                  <input
                    type="number"
                    step="any"
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
                  step="any"
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
                  step="any"
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
                  step="any"
                  className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
                  placeholder={t("standardBatchWeightPlaceholder")}
                  value={formData.standardBatchWeight}
                  onChange={(e) =>
                    setFormData({ ...formData, standardBatchWeight: e.target.value })
                  }
                />
                {errors.standardBatchWeight && (
                  <p className="text-red-400">{errors.standardBatchWeight}</p>
                )}
              </div>

              <div className="md:col-span-2 p-4 bg-gray-800 rounded-lg border border-gray-600 mt-2">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">{t("bomTitle")}</h3>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <Select
                      options={rawMaterials}
                      onChange={handleComponentChange}
                      placeholder={t("bomSelectPlaceholder")}
                      isSearchable
                      styles={{
                        control: (provided) => ({ ...provided, backgroundColor: "white" }),
                        singleValue: (provided) => ({ ...provided, color: "black" }),
                        option: (provided) => ({ ...provided, color: "black", backgroundColor: "white" }),
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-400">{t("bomAddMaterialNote")}</p>
                </div>

                {errors.components && <p className="text-red-400 mb-2">{errors.components}</p>}

                {formData.components.length > 0 && (
                  <div>
                    <table className="w-full border border-gray-700 text-gray-200 mb-4">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="p-2 border border-gray-600">{t("componentLabel")}</th>
                          <th className="p-2 border border-gray-600">{t("gramsLabel")}</th>
                          <th className="p-2 border border-gray-600">{t("actionLabel")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.components.map((comp, idx) => {
                          const item = inventoryItems.find((inv) => inv._id === comp.componentId);
                          return (
                            <tr key={comp.componentId} className="text-center">
                              <td className="p-2 border border-gray-600 text-gray-200">
                                {item?.itemName || t("unknownComponent")}
                              </td>
                              <td className="p-2 border border-gray-600">
                                <input
                                  type="number"
                                  step="any"
                                  className="w-24 p-2 border border-gray-600 rounded bg-gray-900 text-gray-100 text-center"
                                  placeholder={t("gramsPlaceholder")}
                                  value={comp.grams === 0 ? "" : comp.grams}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    // if the user has cleared the field, keep it blank (treated as 0 in your logic)
                                    handleGramsChange(idx, v === "" ? 0 : parseFloat(v));
                                  }}
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
            <p className="text-center text-sm text-gray-600 mt-4">{t("scanInstructions")}</p>
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

// BOM PREVIEW MODAL – shows packaging cost and totals
function BOMPreviewModal({
  onClose,
  formData,
  inventoryItems,
}: {
  onClose: () => void;
  formData: {
    itemName: string;
    standardBatchWeight: string;
    components: ComponentLine[];
  };
  inventoryItems: InventoryItem[];
}) {
  const { itemName, standardBatchWeight, components } = formData;
  const t = useTranslations("inventory.add");
  const batchWeightNum = Number(standardBatchWeight) || 0;

  // compute total cost including packaging
  const totalCost = components.reduce((acc, comp) => {
    const rm = inventoryItems.find((inv) => inv._id === comp.componentId);
    if (!rm) return acc;
    if (rm.category === "Packaging") {
      // per-piece cost
      return acc + (rm.currentCostPrice || 0) * comp.grams;
    }
    // per-gram cost
    return acc + ((rm.currentCostPrice || 0) / 1000) * comp.grams;
  }, 0);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-black bg-opacity-75 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 focus:outline-none"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">
          {t("bomFor")} {itemName || t("nA")}
        </h2>
        <div className="mb-4">
          <span className="font-semibold">{t("productWeightLabel")}: </span>
          {batchWeightNum} g
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full border border-gray-300 text-gray-800">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b border-gray-300">{t("componentLabel")}</th>
                <th className="py-2 px-4 border-b border-gray-300">{t("weightUsed")}</th>
                <th className="py-2 px-4 border-b border-gray-300">{t("percentage")}</th>
                <th className="py-2 px-4 border-b border-gray-300">{t("partialCost")}</th>
              </tr>
            </thead>
            <tbody>
              {components.map((comp, idx) => {
                const rm = inventoryItems.find((inv) => inv._id === comp.componentId);
                const name = rm?.itemName || t("unknownComponent");
                const cost = rm?.currentCostPrice || 0;
                const fraction = batchWeightNum ? comp.grams / batchWeightNum : 0;
                const percentage =
                  rm?.category === "Packaging" ? "—" : (fraction * 100).toFixed(2) + "%";
                const partialCost =
                  rm?.category === "Packaging"
                    ? cost * comp.grams
                    : (cost / 1000) * comp.grams;

                return (
                  <tr key={idx} className="text-sm border-b border-gray-200">
                    <td className="py-2 px-4 font-semibold">{name}</td>
                    <td className="py-2 px-4 text-center">
                      {rm?.category === "Packaging" ? `${comp.grams} pc` : `${comp.grams} g`}
                    </td>
                    <td className="py-2 px-4 text-center">{percentage}</td>
                    <td className="py-2 px-4 text-center">₪{partialCost.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-right font-bold">
          {t("bomTotalCost")} ₪{totalCost.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
