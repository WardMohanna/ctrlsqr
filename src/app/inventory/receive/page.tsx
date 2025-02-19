"use client";

import React, {
  useState,
  useEffect,
  FormEvent,
  ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import Select from "react-select"; // <-- Import react-select

// Supplier interface from DB
interface Supplier {
  _id: string;
  name: string;
}

// Example inventory items (in real app, fetch from DB)
interface InventoryItem {
  _id: string;
  sku: string;
  itemName: string;
  defaultUnit: string;
}

// Hardcoded items for demonstration
const INVENTORY_ITEMS: InventoryItem[] = [
  { _id: "item1", sku: "SKU-001", itemName: "Milk Chocolate", defaultUnit: "kg" },
  { _id: "item2", sku: "SKU-002", itemName: "Hazelnut", defaultUnit: "kg" },
  { _id: "item3", sku: "", itemName: "Custom w/o SKU", defaultUnit: "pieces" },
];

// Each line in the item table
interface LineItem {
  inventoryItemId: string;
  sku: string;
  itemName: string;
  quantity: number;
  unit: string;
  cost: number;
}

export default function ReceiveInventoryWizard() {
  const router = useRouter();

  // ------------------ Step Management ------------------
  const [step, setStep] = useState<1 | 2>(1);

  // ------------------ Supplier List ------------------
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // ------------------ Step 1: Document Info ------------------
  const [supplierId, setSupplierId] = useState("");
  const [officialDocId, setOfficialDocId] = useState("");
  const [internalDocId, setInternalDocId] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");

  // Document date & delivery date
  const [documentDate, setDocumentDate] = useState<string>(""); // user-chosen
  const [deliveryDate] = useState<Date>(new Date()); // auto for "now"

  // File upload (single file)
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // ------------------ Step 2: Items & Remarks ------------------
  const [items, setItems] = useState<LineItem[]>([]);
  const [remarks, setRemarks] = useState("");

  // For adding a new line
  const [newSkuOrName, setNewSkuOrName] = useState("");
  const [newQuantity, setNewQuantity] = useState(0);
  const [newUnit, setNewUnit] = useState("");
  const [newCost, setNewCost] = useState(0);

  // ------------------ Load Suppliers & Generate Internal ID ------------------
  useEffect(() => {
    // 1) Fetch suppliers from your DB
    fetch("/api/supplier")
      .then((res) => res.json())
      .then((data: Supplier[]) => {
        setSuppliers(data);
      })
      .catch((err) => console.error("Error loading suppliers:", err));

    // 2) Fetch or generate the next internalDocId from the server
    fetch("/api/invoice/nextInternalId")
      .then((res) => res.json())
      .then((data) => {
        setInternalDocId(data.nextId); // e.g., "0001"
      })
      .catch(() => {
        // fallback if server fails
        const randomId = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        setInternalDocId(randomId);
      });
  }, []);

  // ------------------ React-Select Options for Suppliers ------------------
  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: s.name,
  }));

  // ------------------ Step Handlers ------------------
  function goNextStep() {
    // Validate Step 1 minimal fields
    if (!supplierId || !officialDocId || !internalDocId || !deliveredBy) {
      alert("Please fill all required fields in Step 1 before proceeding.");
      return;
    }
    setStep(2);
  }

  function goPrevStep() {
    setStep(1);
  }

  // ------------------ File Handling ------------------
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
    }
  }

  // ------------------ Step 2: Add Item to Table ------------------
  function handleAddItem() {
    if (!newSkuOrName || newQuantity <= 0 || !newUnit || newCost < 0) {
      alert("Please fill item (SKU or name), quantity (>0), unit, and cost (>=0).");
      return;
    }

    const matchedItem = INVENTORY_ITEMS.find(
      (inv) => inv.sku === newSkuOrName || inv.itemName === newSkuOrName
    );

    if (!matchedItem) {
      alert("Item not found in inventory. Please pick a valid SKU or name.");
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
        cost: newCost,
      },
    ]);

    // Reset fields
    setNewSkuOrName("");
    setNewQuantity(0);
    setNewUnit("");
    setNewCost(0);
  }

  function handleRemoveLine(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // ------------------ Final Submit ------------------
  async function handleFinalSubmit(e: FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      alert("No items added. Please add at least one line item.");
      return;
    }

    // Build FormData
    const formData = new FormData();
    formData.append("supplierId", supplierId);
    formData.append("officialDocId", officialDocId);
    formData.append("internalDocId", internalDocId);
    formData.append("deliveredBy", deliveredBy);
    formData.append("documentDate", documentDate);
    formData.append("deliveryDate", deliveryDate.toISOString());
    formData.append("remarks", remarks);

    if (file) {
      formData.append("file", file);
    }

    formData.append("items", JSON.stringify(items));

    try {
      const response = await fetch("/api/invoice/create", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create invoice");
      }
      alert("Invoice successfully created!");
      router.push("/inventory/show");
    } catch (err) {
      console.error("Error finalizing invoice:", err);
      alert(`Error: ${err}`);
    }
  }

  // ------------------ Step 1: Document Info Page ------------------
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-3xl border border-gray-700">
          
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            ← Main Menu
          </button>

          <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">Step 1: Document Info</h1>

          {/* Supplier (react-select) */}
          <label className="block text-gray-300 font-semibold mb-1">Supplier</label>
          <Select
            options={supplierOptions}
            isSearchable
            placeholder="Search & Select Supplier"
            className="mb-4"
            // Determine the current value by matching supplierId
            value={
              supplierOptions.find((opt) => opt.value === supplierId) || null
            }
            onChange={(selectedOption) => {
              // If user clears selection, selectedOption might be null
              setSupplierId(selectedOption ? selectedOption.value : "");
            }}
          />

          {/* Official Doc ID */}
          <label className="block text-gray-300 font-semibold mb-1">Official Document ID</label>
          <input
            className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-4"
            placeholder="e.g. Invoice #123"
            value={officialDocId}
            onChange={(e) => setOfficialDocId(e.target.value)}
          />

          {/* Internal Doc ID (read-only) */}
          <label className="block text-gray-300 font-semibold mb-1">Internal Document ID</label>
          <input
            className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-4"
            placeholder="(auto-generated)"
            value={internalDocId}
            readOnly
          />

          {/* Delivered By */}
          <label className="block text-gray-300 font-semibold mb-1">Delivered By</label>
          <input
            className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-4"
            placeholder="Name or 'Unknown'"
            value={deliveredBy}
            onChange={(e) => setDeliveredBy(e.target.value)}
          />

          {/* Document Date */}
          <label className="block text-gray-300 font-semibold mb-1">Document Date</label>
          <input
            type="date"
            className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-4"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
          />

          {/* File Upload */}
          <label className="block text-gray-300 font-semibold mb-1">Upload Invoice/Delivery Note</label>
          <input
            type="file"
            className="p-2 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-4"
            onChange={handleFileChange}
          />

          {filePreview && (
            <div className="mb-4 text-center">
              <p className="text-gray-400">File Preview:</p>
              <iframe
                src={filePreview}
                className="w-full h-40 border border-gray-600 rounded-lg bg-gray-800"
                title="Invoice Preview"
              />
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={goNextStep}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------ Step 2: Items Table + Remarks + Final Submit ------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-4xl border border-gray-700">
        
        <button
          onClick={goPrevStep}
          className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">Step 2: Items + Final Review</h1>

        {/* Dynamic Item Entry */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* SKU or Name */}
          <input
            className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
            placeholder="SKU or Item Name"
            value={newSkuOrName}
            onChange={(e) => setNewSkuOrName(e.target.value)}
          />
          {/* Quantity */}
          <input
            type="number"
            className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
            placeholder="Qty"
            value={newQuantity}
            onChange={(e) => setNewQuantity(Number(e.target.value))}
          />
          {/* Unit */}
          <input
            className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
            placeholder="Unit (e.g. kg, pieces)"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
          />
          {/* Cost */}
          <input
            type="number"
            className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
            placeholder="Cost"
            value={newCost}
            onChange={(e) => setNewCost(Number(e.target.value))}
          />
        </div>

        <button
          onClick={handleAddItem}
          className="mb-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          + Add Item
        </button>

        {/* Items Table */}
        {items.length > 0 && (
          <table className="w-full border border-gray-600 mb-6 text-gray-200">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-3 border border-gray-600">SKU</th>
                <th className="p-3 border border-gray-600">Item Name</th>
                <th className="p-3 border border-gray-600">Quantity</th>
                <th className="p-3 border border-gray-600">Unit</th>
                <th className="p-3 border border-gray-600">Cost</th>
                <th className="p-3 border border-gray-600">Remove</th>
              </tr>
            </thead>
            <tbody>
              {items.map((line, idx) => (
                <tr key={idx} className="text-center">
                  <td className="p-3 border border-gray-600">{line.sku || "-"}</td>
                  <td className="p-3 border border-gray-600">{line.itemName}</td>
                  <td className="p-3 border border-gray-600">{line.quantity}</td>
                  <td className="p-3 border border-gray-600">{line.unit}</td>
                  <td className="p-3 border border-gray-600">{line.cost}</td>
                  <td className="p-3 border border-gray-600">
                    <button
                      onClick={() => handleRemoveLine(idx)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ❌
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Summation of total cost */}
        <div className="text-gray-200 mb-4">
          <span className="font-semibold">Total Cost: </span>
          {items.reduce((sum, i) => sum + i.cost * i.quantity, 0).toFixed(2)}
        </div>

        {/* Remarks (Now in Step 2) */}
        <label className="block text-gray-300 font-semibold mb-1">Remarks</label>
        <textarea
          className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white mb-4"
          placeholder="Any notes about the delivery..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        {/* Document Info Review */}
        <div className="bg-gray-800 p-4 rounded-lg text-gray-200 mb-6">
          <h2 className="font-bold text-lg mb-2">Document Summary</h2>
          <p>Supplier ID: {supplierId}</p>
          <p>Official Doc ID: {officialDocId}</p>
          <p>Internal Doc ID: {internalDocId}</p>
          <p>Delivered By: {deliveredBy}</p>
          <p>Document Date: {documentDate}</p>
          <p>Delivery Date: {deliveryDate.toISOString().slice(0, 10)}</p>
          <p>File Attached: {file ? file.name : "No file"}</p>
        </div>

        {/* Final Submit */}
        <form onSubmit={handleFinalSubmit}>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Submit & Finalize
          </button>
        </form>
      </div>
    </div>
  );
}
