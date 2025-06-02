"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Select from "react-select";
import Quagga from "quagga";
import { useTranslations } from "next-intl";

interface InventoryItem {
    _id: string;
    sku: string;
    itemName: string;
    unit: string;
    currentCostPrice?: number;
  }

type Option = { value: string; label: string };

interface InventoryAddFormProps {
  onCancel: () => void;
  onSuccess: (newItem: InventoryItem) => void;
}

export default function InventoryAddForm({
  onCancel,
  onSuccess,
}: InventoryAddFormProps) {
  const t = useTranslations("inventory.add");

  // form state
  const [sku, setSku] = useState("");
  const [autoSKU, setAutoSKU] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<Option | null>(null);
  const [quantity, setQuantity] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [unit, setUnit] = useState<Option | null>(null);
  const [costPrice, setCostPrice] = useState("");
  const [businessPrice, setBusinessPrice] = useState("");
  const [clientPrice, setClientPrice] = useState("");

  // barcode scanner
  const [scanning, setScanning] = useState(false);

  // categories & units
  const categories: Option[] = [
    { value: "ProductionRawMaterial", label: t("categoryOptions.ProductionRawMaterial") },
    { value: "CoffeeshopRawMaterial", label: t("categoryOptions.CoffeeshopRawMaterial") },
    { value: "CleaningMaterial", label: t("categoryOptions.CleaningMaterial") },
    { value: "Packaging", label: t("categoryOptions.Packaging") },
    { value: "DisposableEquipment", label: t("categoryOptions.DisposableEquipment") },
    { value: "SemiFinalProduct", label: t("categoryOptions.SemiFinalProduct") },
    { value: "FinalProduct", label: t("categoryOptions.FinalProduct") },
  ];
  const units: Option[] = [
    { value: "grams", label: t("unitOptions.grams") },
    { value: "kg", label: t("unitOptions.kg") },
    { value: "ml", label: t("unitOptions.ml") },
    { value: "liters", label: t("unitOptions.liters") },
    { value: "pieces", label: t("unitOptions.pieces") },
  ];

  // kickoff Quagga when scanning=true
  useEffect(() => {
    if (!scanning) return;
    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          constraints: { facingMode: "environment" },
          target: document.querySelector("#scanner"),
        },
        decoder: { readers: ["code_128_reader", "ean_reader", "upc_reader"] },
      },
      (err: any) => {
        if (!err) Quagga.start();
      }
    );
    Quagga.onDetected((res: any) => {
      setBarcode(res.codeResult.code);
      setScanning(false);
    });
    return () => {
      Quagga.stop();
      Quagga.offDetected(() => {});
    };
  }, [scanning]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      sku: autoSKU ? undefined : sku,
      barcode,
      itemName,
      category: category?.value,
      quantity: Number(quantity) || 0,
      minQuantity: Number(minQuantity) || 0,
      unit: unit?.value,
      currentCostPrice: Number(costPrice) || 0,
      currentBusinessPrice: Number(businessPrice) || 0,
      currentClientPrice: Number(clientPrice) || 0,
    };
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const newItem = await res.json();
      onSuccess(newItem.item);
    } else {
      const err = await res.json();
      alert(err.error || t("itemAddedFailure"));
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-6 rounded-lg w-full max-w-md space-y-4"
      >
        <h2 className="text-xl text-white font-bold">{t("title")}</h2>

        <div>
          <label className="text-gray-300">{t("skuLabel")}</label>
          <div className="flex items-center gap-2">
            <input
              disabled={autoSKU}
              value={sku}
              onChange={e => setSku(e.target.value)}
              className="w-full p-2 bg-gray-800 text-white rounded"
            />
            <label className="text-gray-300 flex items-center gap-1">
              <input
                type="checkbox"
                checked={autoSKU}
                onChange={e => setAutoSKU(e.target.checked)}
              />
              {t("autoAssign")}
            </label>
          </div>
        </div>

        <div>
          <label className="text-gray-300">{t("barcodeLabel")}</label>
          <div className="flex gap-2">
            <input
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              className="flex-1 p-2 bg-gray-800 text-white rounded"
            />
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="px-3 py-1 bg-green-600 text-white rounded"
            >
              {t("scan")}
            </button>
          </div>
          {scanning && (
            <div id="scanner" className="w-full h-48 mt-2 bg-black" />
          )}
        </div>

        <div>
          <label className="text-gray-300">{t("itemNameLabel")}</label>
          <input
            required
            value={itemName}
            onChange={e => setItemName(e.target.value)}
            className="w-full p-2 bg-gray-800 text-white rounded"
          />
        </div>

        <div>
          <label className="text-gray-300">{t("categoryLabel")}</label>
          <Select
            options={categories}
            value={category}
            onChange={opt => setCategory(opt)}
            className="bg-white text-black rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-gray-300">{t("quantityLabel")}</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full p-2 bg-gray-800 text-white rounded"
            />
          </div>
          <div>
            <label className="text-gray-300">{t("minQuantityLabel")}</label>
            <input
              type="number"
              value={minQuantity}
              onChange={e => setMinQuantity(e.target.value)}
              className="w-full p-2 bg-gray-800 text-white rounded"
            />
          </div>
        </div>

        <div>
          <label className="text-gray-300">{t("unitLabel")}</label>
          <Select
            options={units}
            value={unit}
            onChange={opt => setUnit(opt)}
            className="bg-white text-black rounded"
          />
        </div>

        <div>
          <label className="text-gray-300">{t("costPriceLabel")}</label>
          <input
            type="number"
            step="any"
            value={costPrice}
            onChange={e => setCostPrice(e.target.value)}
            className="w-full p-2 bg-gray-800 text-white rounded"
          />
        </div>

        {category?.value === "FinalProduct" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-300">{t("businessPriceLabel")}</label>
              <input
                type="number"
                step="any"
                value={businessPrice}
                onChange={e => setBusinessPrice(e.target.value)}
                className="w-full p-2 bg-gray-800 text-white rounded"
              />
            </div>
            <div>
              <label className="text-gray-300">{t("clientPriceLabel")}</label>
              <input
                type="number"
                step="any"
                value={clientPrice}
                onChange={e => setClientPrice(e.target.value)}
                className="w-full p-2 bg-gray-800 text-white rounded"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {t("submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
