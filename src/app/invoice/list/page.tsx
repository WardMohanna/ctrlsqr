"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface InvoiceItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  cost: number;
}

interface SupplierInfo {
  _id: string;
  name: string;
}

interface Invoice {
  _id: string;
  documentId: string;      // Official doc ID
  documentType: string;    // "Invoice" or "DeliveryNote"
  supplier: SupplierInfo;  // Populated from the server
  date: string;            // e.g. document date
  filePath?: string;       // If an uploaded file exists
  createdAt?: string;      // from mongoose timestamps
  updatedAt?: string;
  items: InvoiceItem[];
  deliveredBy?: string;
  remarks?: string;
}

// ------------------ Sorting Types ------------------
type SortColumn = 
  | "documentId" 
  | "supplierName" 
  | "documentType" 
  | "date"
  | "totalCost";

type SortDirection = "asc" | "desc";

export default function ShowInvoicesPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search / Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");

  // For the file preview modal
  const [openFilePath, setOpenFilePath] = useState<string | null>(null);

  // ------------------ Sorting State ------------------
  const [sortColumn, setSortColumn] = useState<SortColumn>("documentId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Fetch the invoice list
  useEffect(() => {
    fetch("/api/invoice")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch invoices");
        return res.json();
      })
      .then((data: Invoice[]) => {
        setInvoices(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching invoices:", err);
        setError("Failed to load invoices");
        setLoading(false);
      });
  }, []);

  // ------------------ Searching & Filtering ------------------
  function matchesSearch(inv: Invoice, supplierName: string) {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true; // no search => everything matches

    // match official doc ID or supplier name
    const docId = inv.documentId?.toLowerCase() || "";
    const suppName = supplierName.toLowerCase();

    return docId.includes(term) || suppName.includes(term);
  }

  function matchesDocType(inv: Invoice) {
    if (!docTypeFilter) return true; // no filter => everything
    return inv.documentType === docTypeFilter;
  }

  // ------------------ Sorting Logic ------------------
  function handleSort(column: SortColumn) {
    // if clicking same column, toggle direction
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function compare(a: any, b: any): number {
    let valA = a[sortColumn];
    let valB = b[sortColumn];

    // handle undefined or null
    if (valA == null) valA = "";
    if (valB == null) valB = "";

    // if sorting by totalCost, it's numeric
    if (sortColumn === "totalCost") {
      const numA = Number(valA);
      const numB = Number(valB);
      return sortDirection === "asc" ? numA - numB : numB - numA;
    }

    // if sorting by date, you might want to parse as Date
    if (sortColumn === "date") {
      // if you store date as string "YYYY-MM-DD", lexical sort is okay
      // or parse:
      // const timeA = new Date(valA).getTime();
      // const timeB = new Date(valB).getTime();
      // ...
      // For simplicity, let's do string compare:
      const strA = String(valA);
      const strB = String(valB);
      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    }

    // for everything else (documentId, supplierName, documentType), do string compare
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    if (strA < strB) return sortDirection === "asc" ? -1 : 1;
    if (strA > strB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  }

  // If still loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-center text-gray-300">Loading invoices...</p>
      </div>
    );
  }

  // If error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }

  // 1) Augment the invoice array with supplierName & totalCost for easy sorting
  const augmented = invoices.map((inv) => {
    const supplierName = inv.supplier?.name ?? "";
    const totalCost = inv.items.reduce((sum, i) => sum + i.cost * i.quantity, 0);
    return { ...inv, supplierName, totalCost };
  });

  // 2) Filter by search & docType
  const filtered = augmented.filter(
    (inv) => matchesSearch(inv, inv.supplierName) && matchesDocType(inv)
  );

  // 3) Sort
  const sorted = [...filtered].sort(compare);

  // Helper to decide if a file is likely a PDF
  function isPDF(path: string) {
    return path.toLowerCase().endsWith(".pdf");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-5xl border border-gray-700">

        {/* Top Controls: Back, Search, Filter */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            ← Back
          </button>

          <div className="flex gap-2">
            {/* Search */}
            <input
              type="text"
              className="p-2 border border-blue-600 rounded-lg bg-blue-200 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Search by doc ID or supplier"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Doc Type Filter */}
            <select
              className="p-2 border border-blue-600 rounded-lg bg-blue-200 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Invoice">Invoice</option>
              <option value="DeliveryNote">Delivery Note</option>
            </select>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-4 text-center text-gray-100">
          Invoices
        </h1>

        {sorted.length === 0 ? (
          <p className="text-center text-gray-300">No matching invoices found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-blue-300">
              <thead className="bg-blue-400 text-black">
                <tr>
                  <SortableHeader
                    label="Official Doc ID"
                    column="documentId"
                    currentColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Supplier"
                    column="supplierName"
                    currentColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Type"
                    column="documentType"
                    currentColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Date"
                    column="date"
                    currentColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Total Cost"
                    column="totalCost"
                    currentColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="border border-blue-300 p-3">File</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((inv) => (
                  <tr
                    key={inv._id}
                    className="text-center bg-blue-100 hover:bg-blue-200 text-black transition-colors"
                  >
                    <td className="border border-blue-300 p-3">{inv.documentId}</td>
                    <td className="border border-blue-300 p-3">{inv.supplierName}</td>
                    <td className="border border-blue-300 p-3">{inv.documentType}</td>
                    <td className="border border-blue-300 p-3">
                      {inv.date?.slice(0, 10) || "-"}
                    </td>
                    <td className="border border-blue-300 p-3">
                      ₪{inv.totalCost.toFixed(2)}
                    </td>
                    <td className="border border-blue-300 p-3">
                      {inv.filePath ? (
                        <button
                          onClick={() => setOpenFilePath(inv.filePath)}
                          className="bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                        >
                          View
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Popup Modal to View the File */}
      {openFilePath && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-xl relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              onClick={() => setOpenFilePath(null)}
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Invoice Preview</h2>
            {isPDF(openFilePath) ? (
              <iframe src={openFilePath} className="w-full h-96" />
            ) : (
              <img src={openFilePath} alt="Invoice" className="max-w-full h-auto" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------ Reusable SortableHeader ------------------
interface SortableHeaderProps {
  label: string;
  column: SortColumn;
  currentColumn: SortColumn;
  direction: SortDirection;
  onSort: (col: SortColumn) => void;
}

function SortableHeader({
  label,
  column,
  currentColumn,
  direction,
  onSort,
}: SortableHeaderProps) {
  const isActive = column === currentColumn;
  const arrow = isActive ? (direction === "asc" ? "▲" : "▼") : "";

  return (
    <th
      className="border border-blue-300 p-3 cursor-pointer hover:bg-blue-300 text-center select-none"
      onClick={() => onSort(column)}
    >
      {label} {arrow && <span className="ml-1">{arrow}</span>}
    </th>
  );
}
