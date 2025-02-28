"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Invoice {
  _id: string;
  documentId: string;       // Official doc ID
  documentType: string;     // "Invoice" or "DeliveryNote"
  supplier: {
    _id: string;
    name: string;
  };
  date: string;             // e.g., document date
  createdAt?: string;       // from mongoose timestamps
  updatedAt?: string;
  items: {
    inventoryItemId: string;
    itemName: string;
    quantity: number;
    cost: number;
  }[];
  // any other fields like deliveredBy, remarks, etc.
}

export default function ShowInvoicesPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search / Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");

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
  function matchesSearch(inv: Invoice) {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true; // no search => everything matches

    // We’ll match on official doc ID or supplier name
    const docId = inv.documentId?.toLowerCase() || "";
    const supplierName = inv.supplier?.name?.toLowerCase() || "";

    return (
      docId.includes(term) ||
      supplierName.includes(term)
    );
  }

  function matchesDocType(inv: Invoice) {
    if (!docTypeFilter) return true; // no filter => everything
    return inv.documentType === docTypeFilter;
  }

  const filteredInvoices = invoices.filter(
    (inv) => matchesSearch(inv) && matchesDocType(inv)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-center text-gray-300">Loading invoices...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
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

        {filteredInvoices.length === 0 ? (
          <p className="text-center text-gray-300">No matching invoices found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-blue-300">
              <thead className="bg-blue-400 text-black">
                <tr>
                  <th className="border border-blue-300 p-3">Official Doc ID</th>
                  <th className="border border-blue-300 p-3">Supplier</th>
                  <th className="border border-blue-300 p-3">Type</th>
                  <th className="border border-blue-300 p-3">Date</th>
                  <th className="border border-blue-300 p-3">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const totalCost = inv.items.reduce(
                    (sum, i) => sum + i.cost * i.quantity,
                    0
                  );
                  return (
                    <tr
                      key={inv._id}
                      className="text-center bg-blue-100 hover:bg-blue-200 text-black transition-colors"
                    >
                      <td className="border border-blue-300 p-3">{inv.documentId}</td>
                      <td className="border border-blue-300 p-3">{inv.supplier?.name}</td>
                      <td className="border border-blue-300 p-3">{inv.documentType}</td>
                      <td className="border border-blue-300 p-3">
                        {inv.date?.slice(0, 10) || "-"}
                      </td>
                      <td className="border border-blue-300 p-3">
                        {totalCost.toFixed(2)}
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
