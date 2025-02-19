"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddSupplierPage() {
  const router = useRouter();

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name) {
      alert("Name is required!");
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
        throw new Error(data.error || "Failed to create supplier");
      }

      // On success, reset form or navigate away
      setMessage("Supplier created successfully!");
      // Optionally redirect somewhere:
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
          ← Back
        </button>

        <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">
          Add New Supplier
        </h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Supplier Name (required) */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">Name *</label>
            <input
              className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
              placeholder="Supplier Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Contact Name */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">Contact Name</label>
            <input
              className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
              placeholder="Contact Person"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">Phone</label>
            <input
              className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
              placeholder="e.g. +1 234 567 890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">Email</label>
            <input
              type="email"
              className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
              placeholder="e.g. supplier@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Address */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">Address</label>
            <input
              className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
              placeholder="Street, City, ZIP"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Tax ID */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">Tax ID</label>
            <input
              className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
              placeholder="e.g. 123456789"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>

          {/* Payment Terms */}
          <div className="flex flex-col">
            <label className="block text-gray-300 font-semibold mb-1">Payment Terms</label>
            <select
              className="p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            >
              <option value="">Select Terms</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 60">Net 60</option>
              <option value="Prepaid">Prepaid</option>
              <option value="Cash on Delivery">Cash on Delivery</option>
            </select>
          </div>

          <button
            type="submit"
            className="md:col-span-2 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition mt-4"
          >
            Add Supplier
          </button>
        </form>

        {message && (
          <p className="mt-6 text-center text-green-400 font-semibold">{message}</p>
        )}
      </div>
    </div>
  );
}
