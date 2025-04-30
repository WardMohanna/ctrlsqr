// app/supplier/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Supplier {
  _id: string;
  name: string;
}

export default function EditSupplierPage() {
  const router = useRouter();
  const t = useTranslations("supplier.edit");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // form fields
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  // 1) load list of all suppliers
  useEffect(() => {
    fetch("/api/supplier")
      .then((res) => res.json())
      .then((data: Supplier[]) => setSuppliers(data))
      .catch((err) => console.error(err));
  }, []);

  // 2) when user selects one, load its details
  useEffect(() => {
    if (!selectedId) return;
    setLoadingSupplier(true);
    fetch(`/api/supplier/${selectedId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load supplier");
        return res.json();
      })
      .then((supplier: any) => {
        setName(supplier.name ?? "");
        setContactName(supplier.contactName ?? "");
        setPhone(supplier.phone ?? "");
        setEmail(supplier.email ?? "");
        setAddress(supplier.address ?? "");
        setTaxId(supplier.taxId ?? "");
        setPaymentTerms(supplier.paymentTerms ?? "");
      })
      .catch((err) => {
        console.error(err);
        setError(t("loadError"));
      })
      .finally(() => setLoadingSupplier(false));
  }, [selectedId, t]);

  // 3) submit updated supplier
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;

    // basic validation
    if (!name.trim()) {
      alert(t("nameRequired"));
      return;
    }
    if (!paymentTerms) {
      alert(t("paymentRequired"));
      return;
    }

    try {
      const res = await fetch(`/api/supplier/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactName,
          phone,
          email,
          address,
          taxId,
          paymentTerms,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t("updateError"));
      }
      setMessage(t("updateSuccess"));
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg w-full max-w-3xl border border-gray-700">
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          {t("back")}
        </button>

        <h1 className="text-3xl font-bold mb-4 text-center text-gray-100">
          {t("title")}
        </h1>

        {/* Supplier selector */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">
            {t("selectLabel")}
          </label>
          <select
            className="w-full p-3 bg-gray-800 text-white border border-gray-600 rounded-lg"
            value={selectedId}
            onChange={(e) => {
              setMessage(null);
              setError(null);
              setSelectedId(e.target.value);
            }}
          >
            <option value="">{t("selectPlaceholder")}</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {loadingSupplier ? (
          <p className="text-gray-400 text-center">{t("loading")}</p>
        ) : selectedId ? (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* reuse same fields as AddSupplierPage */}
            <div className="flex flex-col">
              <label className="block text-gray-300 font-semibold mb-1">
                {t("nameLabel")} <span className="text-red-500">*</span>
              </label>
              <input
                className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                placeholder={t("namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-gray-300 font-semibold mb-1">
                {t("contactLabel")}
              </label>
              <input
                className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                placeholder={t("contactPlaceholder")}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-gray-300 font-semibold mb-1">
                {t("phoneLabel")}
              </label>
              <input
                className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                placeholder={t("phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-gray-300 font-semibold mb-1">
                {t("emailLabel")}
              </label>
              <input
                type="email"
                className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-gray-300 font-semibold mb-1">
                {t("addressLabel")}
              </label>
              <input
                className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                placeholder={t("addressPlaceholder")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-gray-300 font-semibold mb-1">
                {t("taxLabel")}
              </label>
              <input
                className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                placeholder={t("taxPlaceholder")}
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-gray-300 font-semibold mb-1">
                {t("paymentLabel")} <span className="text-red-500">*</span>
              </label>
              <select
                className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                required
              >
                <option value="">{t("selectTerms")}</option>
                <option value="Cash on Delivery">{t("option_cod")}</option>
                <option value="Net 5">{t("option_net5")}</option>
                <option value="Net 10">{t("option_net10")}</option>
                <option value="Net 15">{t("option_net15")}</option>
                <option value="Net 30">{t("option_net30")}</option>
                <option value="Net 60">{t("option_net60")}</option>
                <option value="Prepaid">{t("option_prepaid")}</option>
              </select>
            </div>

            <button
              type="submit"
              className="md:col-span-2 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition mt-4"
            >
              {t("update")}
            </button>
          </form>
        ) : null}

        {message && (
          <p className="mt-6 text-center text-green-400 font-semibold">{message}</p>
        )}
        {error && (
          <p className="mt-6 text-center text-red-400 font-semibold">{error}</p>
        )}
      </div>
    </div>
  );
}
