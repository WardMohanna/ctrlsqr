"use client";

import Link from "next/link";

export default function InventoryMenu() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center p-6">
      
      <h1 className="text-4xl font-bold mb-6 text-gray-100 flex items-center">
        📦 Inventory Management
      </h1>

      <div className="bg-gray-900 p-8 rounded-xl shadow-lg shadow-gray-900/50 w-full max-w-lg border border-gray-700">
        
        {/* 2x2 Grid Layout */}
        <div className="grid grid-cols-2 gap-4">
          
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

          <Link href="/inventory/show">
            <button className="w-full aspect-square bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition flex flex-col items-center justify-center text-lg font-semibold">
              📋 Show Inventory List
            </button>
          </Link>

          <Link href="/inventory/reports">
            <button className="w-full aspect-square bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex flex-col items-center justify-center text-lg font-semibold">
              📊 Inventory Reports (Future)
            </button>
          </Link>

        </div>
      </div>
    </div>
  );
}
