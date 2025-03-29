"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Supplier {
  _id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ShowSuppliersPage() {
  const router = useRouter();
  const t = useTranslations("supplier.list");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/supplier")
      .then((res) => {
        if (!res.ok) {
          throw new Error(t("errorFetching"));
        }
        return res.json();
      })
      .then((data: Supplier[]) => {
        setSuppliers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching suppliers:", err);
        setError(t("errorLoading"));
        setLoading(false);
      });
  }, [t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
        <p className="text-center text-gray-300">{t("loadingSuppliers")}</p>
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
        {/* Top Controls: Back & Add Supplier */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            {t("back")}
          </button>
          <button
            onClick={() => router.push("/supplier/add")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {t("addSupplier")}
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-4 text-center text-gray-100">
          {t("suppliersListTitle")}
        </h1>

        {suppliers.length === 0 ? (
          <p className="text-center text-gray-300">{t("noSuppliersFound")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-600">
              <thead className="bg-gray-700 text-gray-200">
                <tr>
                  <th className="border border-gray-600 p-3">{t("name")}</th>
                  <th className="border border-gray-600 p-3">{t("contact")}</th>
                  <th className="border border-gray-600 p-3">{t("phone")}</th>
                  <th className="border border-gray-600 p-3">{t("email")}</th>
                  <th className="border border-gray-600 p-3">{t("address")}</th>
                  <th className="border border-gray-600 p-3">{t("taxId")}</th>
                  <th className="border border-gray-600 p-3">{t("paymentTerms")}</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((sup) => (
                  <tr
                    key={sup._id}
                    className="text-center bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
                  >
                    <td className="border border-gray-600 p-3">{sup.name}</td>
                    <td className="border border-gray-600 p-3">
                      {sup.contactName || "-"}
                    </td>
                    <td className="border border-gray-600 p-3">
                      {sup.phone || "-"}
                    </td>
                    <td className="border border-gray-600 p-3">
                      {sup.email || "-"}
                    </td>
                    <td className="border border-gray-600 p-3">
                      {sup.address || "-"}
                    </td>
                    <td className="border border-gray-600 p-3">
                      {sup.taxId || "-"}
                    </td>
                    <td className="border border-gray-600 p-3">
                      {sup.paymentTerms || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
