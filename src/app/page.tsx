"use client";

import Link from "next/link";

export default function MainMenu() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center p-6">
      
      {/* Inventory Section */}
      <h1 className="text-4xl font-bold mb-6 text-gray-100 flex items-center">
        📦 Inventory Management
      </h1>

      <div className="bg-gray-900 p-8 rounded-xl shadow-lg shadow-gray-900/50 w-full max-w-lg border border-gray-700">
        {/* 3-row × 2-column Grid Layout for Inventory */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Row 1 */}
          <Link href="/inventory/add">
            <button className="w-full aspect-square bg-violet-700 text-white rounded-lg hover:bg-violet-800 transition flex flex-col items-center justify-center text-lg font-semibold">
              ➕ Add Inventory Item
            </button>
          </Link>

          <Link href="/inventory/receive">
            <button className="w-full aspect-square bg-green-800 text-white rounded-lg hover:bg-green-900 transition flex flex-col items-center justify-center text-lg font-semibold">
              📥 Receive Inventory
            </button>
          </Link>

          {/* Row 2 */}
          <Link href="/inventory/show">
            <button className="w-full aspect-square bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition flex flex-col items-center justify-center text-lg font-semibold">
              📋 Show Inventory List
            </button>
          </Link>

          <Link href="/inventory/stock-count">
            <button className="w-full aspect-square bg-red-700 text-white rounded-lg hover:bg-red-800 transition flex flex-col items-center justify-center text-lg font-semibold">
              📝 Stock Count
            </button>
          </Link>

          {/* Row 3 */}
          <Link href="/inventory/snapshot">
            <button className="w-full aspect-square bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition flex flex-col items-center justify-center text-lg font-semibold">
              📅 Snapshot
            </button>
          </Link>
        </div>
      </div>

      {/* Supplier Section */}
      <h2 className="text-3xl font-bold mt-12 mb-6 text-gray-100 flex items-center">
        🏷️ Supplier Management
      </h2>

      <div className="bg-gray-900 p-8 rounded-xl shadow-lg shadow-gray-900/50 w-full max-w-md border border-gray-700">
        {/* 2-column Grid for Suppliers */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/supplier/add">
            <button className="w-full aspect-square bg-pink-700 text-white rounded-lg hover:bg-pink-800 transition flex flex-col items-center justify-center text-lg font-semibold">
              ➕ Add Supplier
            </button>
          </Link>

          <Link href="/supplier/list">
            <button className="w-full aspect-square bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 transition flex flex-col items-center justify-center text-lg font-semibold">
              📋 Show Suppliers
            </button>
          </Link>
        </div>
      </div>

      {/* Invoice Section */}
      <h2 className="text-3xl font-bold mt-12 mb-6 text-gray-100 flex items-center">
        🧾 Invoice Management
      </h2>

      <div className="bg-gray-900 p-8 rounded-xl shadow-lg shadow-gray-900/50 w-full max-w-md border border-gray-700">
        {/* Single button for Show Invoices */}
        <div className="grid grid-cols-1 gap-4">
          <Link href="/invoice/list">
            <button className="w-full bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition py-4 text-lg font-semibold">
              📋 Show Invoice List
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
