"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function AddSupplierPage() {
  const router = useRouter();
  const t = useTranslations("supplier.add");

  // Form fields
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  // Optional: If you want a success or error message
  const [message, setMessage] = useState<string | null>(null);

  //recomment when ever you want calid Email for supplier
  // function isValidEmail(email: string): boolean {
  //   return /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|yourdomain\.com)$/.test(email);
  // }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    //name is a mjst to fill
    if (!name) {
      alert(t("nameRequired")); // "Name is required!"
      return;
    }

    //payment terms is a nust to fill
    if (!paymentTerms) {
      alert(t("paymentRequired")); // "Payment terms are required!"
      return;
    }
  

    try {
      const response = await fetch("/api/supplier", {
        method: "POST",
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("createError"));
      }

      // On success, reset form or navigate away
      setMessage(t("createSuccess"));
      // Optionally redirect:
      // router.push("/somewhere")
    } catch (err: any) {
      console.error("Error creating supplier:", err);
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-3xl border border-gray-700">
        
        {/* Back Button */}
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
          
          {/* Supplier Name (required) */}
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

          {/* Contact Name */}
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

          {/* Phone */}
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

          {/* Email */}
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

          {/* Address */}
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

          {/* Tax ID */}
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

          {/* Payment Terms */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">
              {t("paymentLabel")} <span className="text-red-500">*</span>

            </label>
            <select
              className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
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
            {t("submit")}
          </button>
        </form>

        {message && (
          <p className="mt-6 text-center text-green-400 font-semibold">{message}</p>
        )}
      </div>
    </div>
  );
}
