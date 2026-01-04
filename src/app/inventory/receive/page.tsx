"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from "react";
import InventoryAddForm from "@/components/InventoryAddForm";
import { useRouter } from "next/navigation";
import Select from "react-select";
import Quagga from "quagga";
import { useTranslations } from "next-intl";

//
// Types
//
interface Supplier {
  _id: string;
  name: string;
}

interface InventoryItem {
  _id: string;
  sku: string;
  itemName: string;
  unit: string;
  currentCostPrice?: number;
}

interface LineItem {
  inventoryItemId: string;
  sku: string;
  itemName: string;
  quantity: number;
  unit: string;
  cost: number; // stored EX VAT
}

// BOM form data type (for preview)
interface BOMFormData {
  itemName: string;
  standardBatchWeight: number;
  components: { componentId: string; grams: number }[];
}

//
// Receive Inventory Page Component
//
export default function ReceiveInventoryPage() {
  const router = useRouter();
  const t = useTranslations("inventory.receive");

  // ------------------ Step Management ------------------
  const [step, setStep] = useState<1 | 2>(1);

  // ------------------ Supplier & Items Lists ------------------
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);

  // ------------------ Step 1: Document Info ------------------
  const [supplierId, setSupplierId] = useState("");
  const [officialDocId, setOfficialDocId] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [documentDate, setDocumentDate] = useState<string>("");
  const [receivedDate] = useState<Date>(new Date());
  const [file, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState<"Invoice" | "DeliveryNote">(
    "Invoice"
  );

  // ------------------ Step 2: Items & Remarks ------------------
  const [items, setItems] = useState<LineItem[]>([]);
  const [remarks, setRemarks] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [newUnit, setNewUnit] = useState<string>("");

  const VAT_RATE = 0.18;

  // מחיר לפני / כולל מע"מ
  const [newCostExVat, setNewCostExVat] = useState<number>(0);
  const [newCostIncVat, setNewCostIncVat] = useState<number>(0);

  // נעילה/עריכה
  const [isCostEditable, setIsCostEditable] = useState<boolean>(false);

  // נשמר אצלך למניעת "מלחמה" אם תרצה להפעיל בעתיד
  const [lastEditedCostField, setLastEditedCostField] = useState<"ex" | "inc">(
    "ex"
  );

  const [showNewItem, setShowNewItem] = useState(false);

  // ------------------ BOM Preview Data ------------------
  const [bomFormData, setBomFormData] = useState<BOMFormData>({
    itemName: "",
    standardBatchWeight: 0,
    components: [],
  });
  const [showBOMModal, setShowBOMModal] = useState(false);

  //
  // Fetch suppliers & items on mount
  //
  useEffect(() => {
    fetch("/api/supplier")
      .then((res) => res.json())
      .then((data: Supplier[]) => setSuppliers(data))
      .catch((err) => console.error(t("errorLoadingSuppliers"), err));

    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data: InventoryItem[]) => setAllItems(data))
      .catch((err) => console.error(t("errorLoadingItems"), err));
  }, [t]);

  //
  // Build react-select options
  //
  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: s.name,
  }));

  const itemOptions = allItems.map((it) => ({
    value: it._id,
    label: it.itemName,
  }));

  //
  // Step Handlers
  //
  function goNextStep() {
    if (!supplierId || !officialDocId || !deliveredBy) {
      alert(t("errorFillStep1"));
      return;
    }
    setStep(2);
  }

  function goPrevStep() {
    setStep(1);
  }

  //
  // File Handling
  //
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFile]);
      setPreviews((prev) => [
        ...prev,
        ...selectedFile.map((f) => URL.createObjectURL(f)),
      ]);
    }
  }

  //
  // Add Item to Table
  //
  function handleAddItem() {
    if (!selectedItemId || newQuantity <= 0 || !newUnit || newCostExVat < 0) {
      alert(t("errorFillItem"));
      return;
    }

    const matchedItem = allItems.find((it) => it._id === selectedItemId);
    if (!matchedItem) {
      alert(t("errorItemNotFound"));
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        inventoryItemId: matchedItem._id,
        sku: matchedItem.sku,
        itemName: matchedItem.itemName,
        quantity: newQuantity,
        unit: newUnit,
        cost: newCostExVat, // EX VAT
      },
    ]);

    setSelectedItemId("");
    setNewQuantity(0);
    setNewUnit("");
    setNewCostExVat(0);
    setNewCostIncVat(0);
    setIsCostEditable(false);
    setLastEditedCostField("ex");
  }

  function handleRemoveLine(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  //
  // Final Submit
  //
  async function handleFinalSubmit(e: FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      alert(t("errorNoLineItems"));
      return;
    }

    const formDataObj = new FormData();
    formDataObj.append("supplierId", supplierId);
    formDataObj.append("officialDocId", officialDocId);
    formDataObj.append("deliveredBy", deliveredBy);
    formDataObj.append("documentDate", documentDate);
    formDataObj.append("receivedDate", receivedDate.toISOString());
    formDataObj.append("remarks", remarks);
    formDataObj.append("documentType", documentType);

    if (file?.length) {
      file.forEach((f) => formDataObj.append("file", f));
    }

    formDataObj.append("items", JSON.stringify(items));

    try {
      const response = await fetch("/api/invoice", {
        method: "POST",
        body: formDataObj,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("errorCreatingInvoice"));
      }

      alert(t("invoiceCreatedSuccess"));
    } catch (err: any) {
      console.error("Error finalizing invoice:", err);
      alert(t("errorFinalizingInvoice") + ": " + err.message);
    }
  }

  //
  // Barcode Scanning
  //
  const [isScannerOpen, setIsScannerOpen] = useState(false);

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
          readers: [
            "code_128_reader",
            "ean_reader",
            "upc_reader",
            "code_39_reader",
          ],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScannerOpen]);

  function onDetected(result: any) {
    const code = result.codeResult.code;
    console.log("Barcode detected:", code);
    setIsScannerOpen(false);
  }

  //
  // Step 1: Document Info
  //
  if (step === 1) {
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
            {t("step1Title")}
          </h1>

          <label className="block text-gray-300 font-semibold mb-1">
            {t("supplierLabel")}
          </label>
          <Select
            options={supplierOptions}
            isSearchable
            placeholder={t("supplierPlaceholder")}
            className="mb-4"
            value={
              supplierOptions.find((opt) => opt.value === supplierId) || null
            }
            onChange={(selectedOption) => {
              setSupplierId(selectedOption ? selectedOption.value : "");
            }}
            styles={{
              control: (styles) => ({
                ...styles,
                backgroundColor: "white",
                color: "black",
              }),
              singleValue: (styles) => ({ ...styles, color: "black" }),
              menu: (styles) => ({ ...styles, backgroundColor: "white" }),
              option: (styles, { isSelected }) => ({
                ...styles,
                backgroundColor: isSelected ? "#007bff" : "white",
                color: isSelected ? "white" : "black",
              }),
            }}
          />

          <label className="block text-gray-300 font-semibold mb-1">
            {t("documentTypeLabel")}
          </label>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setDocumentType("Invoice")}
              className={
                documentType === "Invoice"
                  ? "px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                  : "px-4 py-2 rounded-lg bg-gray-600 text-gray-200 hover:bg-gray-500"
              }
            >
              {t("invoice")}
            </button>
            <button
              onClick={() => setDocumentType("DeliveryNote")}
              className={
                documentType === "DeliveryNote"
                  ? "px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                  : "px-4 py-2 rounded-lg bg-gray-600 text-gray-200 hover:bg-gray-500"
              }
            >
              {t("deliveryNote")}
            </button>
          </div>

          <label className="block text-gray-300 font-semibold mb-1">
            {t("officialDocIdLabel")}
          </label>
          <input
            className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-4"
            placeholder={t("officialDocIdPlaceholder")}
            value={officialDocId}
            onChange={(e) => setOfficialDocId(e.target.value)}
          />

          <label className="block text-gray-300 font-semibold mb-1">
            {t("deliveredByLabel")}
          </label>
          <input
            className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-4"
            placeholder={t("deliveredByPlaceholder")}
            value={deliveredBy}
            onChange={(e) => setDeliveredBy(e.target.value)}
          />

          <label className="block text-gray-300 font-semibold mb-1">
            {t("documentDateLabel")}
          </label>
          <input
            type="date"
            className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-4"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />

          <label className="block text-gray-300 font-semibold mb-1">
            {t("fileUploadLabel")}
          </label>
          <input
            type="file"
            className="p-2 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-4"
            multiple
            onChange={handleFileChange}
          />

          {previews.length > 0 && (
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  {file[i]?.type?.startsWith("image/") ? (
                    <img
                      src={src}
                      alt={`preview ${i}`}
                      className="w-full h-32 object-contain rounded-lg border border-gray-600 bg-gray-800"
                    />
                  ) : (
                    <iframe
                      src={src}
                      className="w-full h-32 border border-gray-600 rounded-lg bg-gray-800"
                      title={`preview-frame-${i}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFiles((f) => f.filter((_, idx) => idx !== i));
                      setPreviews((p) => p.filter((_, idx) => idx !== i));
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={goNextStep}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {t("next")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  //
  // Step 2: Items + Remarks + Final Submit
  //
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-4xl border border-gray-700">
        <button
          onClick={goPrevStep}
          className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          {t("back")}
        </button>

        <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">
          {t("step2Title")}
        </h1>

        {/* ✅ GRID תקין: 4 עמודות, והעלות בתוך העמודה הרביעית */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* פריט */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">
              {t("itemLabel")}
            </label>
            <Select
              options={itemOptions}
              isSearchable
              placeholder={t("itemPlaceholder")}
              value={
                itemOptions.find((opt) => opt.value === selectedItemId) || null
              }
              styles={{
                singleValue: (provided) => ({ ...provided, color: "black" }),
                option: (provided) => ({ ...provided, color: "black" }),
              }}
              onChange={(selectedOption) => {
                if (!selectedOption) {
                  setSelectedItemId("");
                  setNewUnit("");
                  setNewCostExVat(0);
                  setNewCostIncVat(0);
                  setIsCostEditable(false);
                  setLastEditedCostField("ex");
                  return;
                }

                setSelectedItemId(selectedOption.value);
                const matchedItem = allItems.find(
                  (it) => it._id === selectedOption.value
                );

                if (matchedItem) {
                  setNewUnit(matchedItem.unit || "");
                  const base = matchedItem.currentCostPrice ?? 0; // EX VAT
                  setNewCostExVat(base);
                  setNewCostIncVat(
                    Number((base * (1 + VAT_RATE)).toFixed(2))
                  );
                  setIsCostEditable(false);
                  setLastEditedCostField("ex");
                } else {
                  setNewUnit("");
                  setNewCostExVat(0);
                  setNewCostIncVat(0);
                  setIsCostEditable(false);
                  setLastEditedCostField("ex");
                }
              }}
            />
          </div>

          {/* כמות */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">
              {t("quantityLabel")}
            </label>
            <input
              type="number"
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              placeholder={t("quantityPlaceholder")}
              value={newQuantity}
              onChange={(e) => setNewQuantity(Number(e.target.value))}
            />
          </div>

          {/* יחידה */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">
              {t("unitLabel")}
            </label>
            <input
              type="text"
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              placeholder={t("unitPlaceholder")}
              value={newUnit}
              readOnly
            />
          </div>

          {/* עלות */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">
              {t("costLabel")}
            </label>

            <label className="flex items-center gap-2 text-gray-300 text-sm mb-2">
              <input
                type="checkbox"
                checked={isCostEditable}
                onChange={(e) => setIsCostEditable(e.target.checked)}
              />
              {t("editPrice")}
            </label>

            <label className="block text-gray-300 text-sm mb-1">
              {t("costExVatLabel")}
            </label>
            <input
              type="number"
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-2"
              placeholder="Cost before VAT"
              value={newCostExVat}
              disabled={!isCostEditable}
              onChange={(e) => {
                const typed = Number(e.target.value) || 0;
                setNewCostExVat(typed);
                setNewCostIncVat(
                  Number((typed * (1 + VAT_RATE)).toFixed(2))
                );
                setLastEditedCostField("ex");
              }}
            />

            <label className="block text-gray-300 text-sm mb-1">
              {t("costIncVatLabel")}
            </label>
            <input
              type="number"
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              placeholder="Cost incl. VAT"
              value={newCostIncVat}
              disabled={!isCostEditable}
              onChange={(e) => {
                const typed = Number(e.target.value) || 0;
                setNewCostIncVat(typed);
                setNewCostExVat(
                  Number((typed / (1 + VAT_RATE)).toFixed(2))
                );
                setLastEditedCostField("inc");
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 mb-6">
          <button
            onClick={handleAddItem}
            className="mb-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            {t("addItem")}
          </button>

          <button
            className="mb-6 ml-5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            onClick={() => setShowNewItem(true)}
          >
            + {t("addNewProduct")}
          </button>

          {showNewItem && (
            <InventoryAddForm
              onCancel={() => setShowNewItem(false)}
              onSuccess={(newItem) => {
                setAllItems((items) => [...items, newItem]);
                setShowNewItem(false);
              }}
            />
          )}
        </div>

        {items.length > 0 && (
          <table className="w-full border border-gray-600 mb-6 text-gray-200">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-3 border border-gray-600">{t("sku")}</th>
                <th className="p-3 border border-gray-600">{t("itemName")}</th>
                <th className="p-3 border border-gray-600">{t("quantity")}</th>
                <th className="p-3 border border-gray-600">{t("unit")}</th>
                <th className="p-3 border border-gray-600">{t("cost")}</th>
                <th className="p-3 border border-gray-600">{t("remove")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((line, idx) => (
                <tr key={idx} className="text-center">
                  <td className="p-3 border border-gray-600">
                    {line.sku || "-"}
                  </td>
                  <td className="p-3 border border-gray-600">{line.itemName}</td>
                  <td className="p-3 border border-gray-600">{line.quantity}</td>
                  <td className="p-3 border border-gray-600">{line.unit}</td>

                  {/* ✅ עלות: עמודה אחת (לא 2 td) */}
                  <td className="p-3 border border-gray-600">
                    <div>₪{line.cost.toFixed(2)} (ex)</div>
                    <div className="text-sm text-gray-400">
                      ₪{(line.cost * (1 + VAT_RATE)).toFixed(2)} (inc)
                    </div>
                  </td>

                  <td className="p-3 border border-gray-600">
                    <button
                      onClick={() => handleRemoveLine(idx)}
                      className="text-white hover:text-red-600"
                    >
                      {t("remove")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="text-gray-200 mb-4">
          <span className="font-semibold">{t("totalCostLabel")}: </span>
          ₪{items.reduce((sum, i) => sum + i.cost * i.quantity, 0).toFixed(2)}
        </div>

        <label className="block text-gray-300 font-semibold mb-1">
          {t("remarksLabel")}
        </label>
        <textarea
          className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-4"
          placeholder={t("remarksPlaceholder")}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <div className="bg-gray-800 p-4 rounded-lg text-gray-200 mb-6">
          <h2 className="font-bold text-lg mb-2">
            {t("documentSummaryTitle")}
          </h2>
          <p>
            {t("supplierIdLabel")}: {supplierId}
          </p>
          <p>
            {t("officialDocIdLabel")}: {officialDocId}
          </p>
          <p>
            {t("deliveredByLabel")}: {deliveredBy}
          </p>
          <p>
            {t("documentDateLabel")}: {documentDate}
          </p>
          <p>
            {t("receivedDateLabel")}: {receivedDate.toISOString().slice(0, 10)}
          </p>
          <p>
            {t("fileAttachedLabel")}:{" "}
            {file.length > 0 ? file.map((f) => f.name).join(", ") : t("noFile")}
          </p>
        </div>

        <form onSubmit={handleFinalSubmit}>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {t("submitAndFinalize")}
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
            <h2 className="text-xl font-bold p-4">{t("scanBarcodeTitle")}</h2>
            <div id="interactive" className="w-full h-80" />
            <p className="text-center text-sm text-gray-600 p-2">
              {t("scanInstructions")}
            </p>
          </div>
        </div>
      )}

      {/* BOM PREVIEW MODAL */}
      {showBOMModal && (
        <BOMPreviewModal
          onClose={() => setShowBOMModal(false)}
          formData={bomFormData}
          inventoryItems={allItems}
        />
      )}
    </div>
  );
}

// ------------------ BOM PREVIEW MODAL ------------------
function BOMPreviewModal({
  onClose,
  formData,
  inventoryItems,
}: {
  onClose: () => void;
  formData: BOMFormData;
  inventoryItems: InventoryItem[];
}) {
  const t = useTranslations("inventory.receive");
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
          {t("bomFor")} {itemName || t("nA")}
        </h2>

        <div className="mb-4">
          <span className="font-semibold">{t("productWeightLabel")}: </span>
          {standardBatchWeight} g
        </div>

        {components.length === 0 ? (
          <p>{t("noComponents")}</p>
        ) : (
          <div className="space-y-4">
            {components.map((comp, idx) => {
              const rm = inventoryItems.find((inv) => inv._id === comp.componentId);
              const rmName = rm?.itemName || t("unknownComponent");
              const rmCost = rm?.currentCostPrice ?? 0;
              const fraction = standardBatchWeight
                ? comp.grams / standardBatchWeight
                : 0;
              const percentage = fraction * 100;
              const costPerGram = rmCost / 1000;
              const partialCost = costPerGram * comp.grams;

              return (
                <div key={idx} className="border-b border-gray-300 pb-2">
                  <div className="font-semibold">{rmName}</div>
                  <div className="text-sm text-gray-700">
                    <div>
                      {t("weightUsed")}: {comp.grams} g
                    </div>
                    <div>
                      {t("percentage")}: {percentage.toFixed(2)}%
                    </div>
                    <div>
                      {t("partialCost")}: ₪{partialCost.toFixed(2)}
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
