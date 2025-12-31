"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface InvoiceItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  cost: number;
  unit?: string;
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
  receivedDate?: string;   // Actual received date
  filePaths?: string[];       // If an uploaded file exists
  createdAt?: string;      // from mongoose timestamps
  updatedAt?: string;
  items: InvoiceItem[];
  deliveredBy?: string;
  remarks?: string;
}

/** 
 * We create a new interface that extends your Invoice 
 * with two extra fields: supplierName and totalCost 
 */
interface AugmentedInvoice extends Invoice {
  supplierName: string;
  totalCost: number;
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
  const t = useTranslations("invoice.list");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search / Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");

  // For the file preview modal
  const [openFilePath, setOpenFilePath] = useState<string | null>(null);
  // For invoice details modal
  const [openInvoice, setOpenInvoice] = useState<AugmentedInvoice | null>(null);

  // ------------------ Sorting State ------------------
  const [sortColumn, setSortColumn] = useState<SortColumn>("documentId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

   const [isPdfPreview, setIsPdfPreview] = useState(false);

  // Fetch the invoice list
  useEffect(() => {
    fetch("/api/invoice")
      .then((res) => {
        if (!res.ok) throw new Error(t("errorFetching"));
        return res.json();
      })
      .then((data: Invoice[]) => {
        setInvoices(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching invoices:", err);
        setError(t("errorLoading"));
        setLoading(false);
      });
  }, [t]);

  // ------------------ Searching & Filtering ------------------

  /**
   * The helper that checks if the item matches the user’s search
   * We use the 'supplierName' field from the augmented type 
   * (which we’ll define below).
   */
  function matchesSearch(inv: AugmentedInvoice, supplierName: string) {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true; // no search => everything matches

    // match official doc ID or supplier name
    const docId = inv.documentId?.toLowerCase() || "";
    const suppName = supplierName.toLowerCase();
    return docId.includes(term) || suppName.includes(term);
  }

  function matchesDocType(inv: AugmentedInvoice) {
    if (!docTypeFilter) return true; // no filter => everything
    return inv.documentType === docTypeFilter;
  }

  // ------------------ Sorting Logic ------------------
  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function compare(a: AugmentedInvoice, b: AugmentedInvoice): number {
    let valA = a[sortColumn];
    let valB = b[sortColumn];

    if (valA == null) valA = "";
    if (valB == null) valB = "";

    // numeric columns
    if (sortColumn === "totalCost") {
      const numA = Number(valA);
      const numB = Number(valB);
      return sortDirection === "asc" ? numA - numB : numB - numA;
    }

    // date column
    if (sortColumn === "date") {
      const strA = String(valA);
      const strB = String(valB);
      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    }

    // string columns
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    if (strA < strB) return sortDirection === "asc" ? -1 : 1;
    if (strA > strB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-center text-gray-300">{t("loadingInvoices")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }

  // 1) We define an array of AugmentedInvoice so TypeScript 
  //    knows about our extra fields (supplierName, totalCost)
    const augmented: AugmentedInvoice[] = invoices.map((inv) => ({
      ...inv,
      supplierName: inv.supplier.name,
      totalCost: inv.items.reduce((sum, i) => sum + i.cost * i.quantity, 0),
    }));

  // 2) Filter and sort are also arrays of AugmentedInvoice
  const filtered: AugmentedInvoice[] = augmented.filter(
    (inv) => matchesSearch(inv, inv.supplierName) && matchesDocType(inv)
  );
  const sorted: AugmentedInvoice[] = [...filtered].sort(compare);

  // 3) Translate doc type from English to Hebrew
  const translateDocumentType = (type: string) => {
    if (type === "Invoice") {
      return t("invoice", { defaultValue: "חשבונית" });
    } else if (type === "DeliveryNote") {
      return t("deliveryNote", { defaultValue: "תעודת משלוח" });
    }
    return type;
  };

  const handleOpenFile = async (filePath: string) => {
    setOpenFilePath(filePath);
    try {
      const response = await fetch(`/api/uploads/${filePath}`, { method: 'HEAD' });
      if (response.ok) {
        const contentType = response.headers.get('Content-Type');
        setIsPdfPreview(contentType === 'application/pdf');
      }
    } catch (error) {
      console.error("Error checking file type:", error);
      setIsPdfPreview(false); // Fallback to rendering as image on error
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-5xl border border-blue-300">
        {/* Top Controls: Back, Search, Filter */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          >
            {t("back")}
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              className="p-2 border border-blue-600 rounded bg-blue-200 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="p-2 border border-blue-600 rounded bg-blue-200 text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
            >
              <option value="">{t("allTypes")}</option>
              <option value="Invoice">{t("invoice", { defaultValue: "חשבונית" })}</option>
              <option value="DeliveryNote">{t("deliveryNote", { defaultValue: "תעודת משלוח" })}</option>
            </select>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-4 text-center text-gray-100">
          {t("invoicesTitle")}
        </h1>

        {sorted.length === 0 ? (
          <p className="text-center text-gray-300">{t("noInvoicesFound")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-blue-300">
              <thead className="bg-blue-500 text-white">
                <tr>
                  <SortableHeader
                    label={t("docId")}
                    column="documentId"
                    currentColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label={t("supplier")}
                    column="supplierName"
                    currentColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label={t("documentType")}
                    column="documentType"
                    currentColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label={t("date")}
                    column="date"
                    currentColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label={t("totalCost")}
                    column="totalCost"
                    currentColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="border border-blue-300 p-3">{t("file")}</th>
                  <th className="border border-blue-300 p-3">{t("invoiceDetails")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((inv) => (
                  <tr
                    key={inv._id}
                    className="text-center bg-blue-100 hover:bg-blue-200 text-black transition-colors cursor-pointer"
                  >
                    <td
                      className="border border-blue-300 p-3"
                      onClick={() => setOpenInvoice(inv)}
                    >
                      {inv.documentId}
                    </td>
                    <td
                      className="border border-blue-300 p-3"
                      onClick={() => setOpenInvoice(inv)}
                    >
                      {inv.supplierName}
                    </td>
                    <td
                      className="border border-blue-300 p-3"
                      onClick={() => setOpenInvoice(inv)}
                    >
                      {translateDocumentType(inv.documentType)}
                    </td>
                    <td
                      className="border border-blue-300 p-3"
                      onClick={() => setOpenInvoice(inv)}
                    >
                      {inv.date?.slice(0, 10) || "-"}
                    </td>
                    <td
                      className="border border-blue-300 p-3"
                      onClick={() => setOpenInvoice(inv)}
                    >
                      ₪{inv.totalCost.toFixed(2)}
                    </td>
                    <td className="border p-2">
                    {(inv.filePaths ?? []).length > 0 ? (
                      (inv.filePaths ?? []).map((fp) => (
                        <button
                          key={fp}
                          className="mr-2 px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        onClick={() => handleOpenFile(fp)}
                        >
                          {t("view")}
                        </button>
                      ))
                    ) : (
                      "-"
                    )}
                  </td>
                    <td className="border border-blue-300 p-3">
                      <button
                        onClick={() => setOpenInvoice(inv)}
                        className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                      >
                        {t("invoiceDetails")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {openInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-3xl text-black relative">
            <button
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-2xl"
              onClick={() => setOpenInvoice(null)}
            >
              ×
            </button>
            <h2 className="text-3xl font-bold mb-6 border-b pb-2">{t("invoiceDetails")}</h2>

            <table className="w-full text-base">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td
                    className="py-2 px-4 font-bold text-gray-700"
                    style={{ minWidth: "150px" }}
                  >
                    {t("docId")}:
                  </td>
                  <td className="py-2 px-4 text-gray-900">{openInvoice.documentId}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 px-4 font-bold text-gray-700">{t("supplier")}:</td>
                  <td className="py-2 px-4 text-gray-900">{openInvoice.supplierName}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 px-4 font-bold text-gray-700">
                    {t("documentType")}:
                  </td>
                  <td className="py-2 px-4 text-gray-900">
                    {translateDocumentType(openInvoice.documentType)}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 px-4 font-bold text-gray-700">
                    {t("date")}:
                  </td>
                  <td className="py-2 px-4 text-gray-900">
                    {openInvoice.date?.slice(0, 10)}
                  </td>
                </tr>
                {openInvoice.receivedDate && (
                  <tr className="border-b border-gray-300">
                    <td className="py-2 px-4 font-bold text-gray-700">
                      {t("receivedDateLabel")}:
                    </td>
                    <td className="py-2 px-4 text-gray-900">
                      {openInvoice.receivedDate.slice(0, 10)}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-gray-300">
                  <td className="py-2 px-4 font-bold text-gray-700">
                    {t("deliveredByLabel")}:
                  </td>
                  <td className="py-2 px-4 text-gray-900">
                    {openInvoice.deliveredBy || "-"}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-2 px-4 font-bold text-gray-700">
                    {t("remarksLabel")}:
                  </td>
                  <td className="py-2 px-4 text-gray-900">
                    {openInvoice.remarks || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-bold text-gray-700 align-top">
                    {t("itemsLabel")}:
                  </td>
                  <td className="py-2 px-4">
                    <table className="w-full border border-gray-300">
                      <thead className="bg-gray-200 text-gray-800">
                        <tr>
                          <th className="p-1 border">Item</th>
                          <th className="p-1 border text-center">Qty</th>
                          <th className="p-1 border text-center">Unit</th>
                          <th className="p-1 border text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openInvoice.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-200">
                            <td className="p-1 border">{item.itemName}</td>
                            <td className="p-1 border text-center">{item.quantity}</td>
                            <td className="p-1 border text-center">{item.unit || "-"}</td>
                            <td className="p-1 border text-right">₪{item.cost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* File Modal */}
      {openFilePath && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-xl relative text-black">
              <button
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-2xl"
              onClick={() => setOpenFilePath(null)}
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">{t("invoicePreview")}</h2>

            {isPdfPreview ? (
              <iframe
                src={`/api/uploads/${openFilePath}`}
                title={t("invoicePreview")}
                className="w-full h-96"
              />
            ) : (
              <img
                src={`/api/uploads/${openFilePath}`}
                alt={t("invoicePreview")}
                className="max-w-full h-auto"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 
 * Reusable SortableHeader
 */
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
