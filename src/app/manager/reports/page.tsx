"use client";

import React, { useState, useEffect } from "react";

interface ReportRow {
  date: string;
  task: string;
  quantity: number;
  timeWorked: string;
  bomCost: number;
  user: string;
  product: string;
}

export default function ProductionReportPage() {
  // Compute today's and tomorrow's dates as strings.
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  
  // Use state for the report data from the backend.
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterProduct, setFilterProduct] = useState<string>("");
  
  // Date filters (Default to today)
  const [filterStartDate, setFilterStartDate] = useState<string>(todayStr);
  const [filterEndDate, setFilterEndDate] = useState<string>(todayStr);

  // Fetch reports from the backend API with Date Params
  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // Create Query Params
      const params = new URLSearchParams();
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);

      const res = await fetch(`/api/report?${params.toString()}`, { method: "GET" });
      
      if (!res.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = await res.json();
      setReports(data.report || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      setError("Error fetching reports");
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when the page loads OR when dates change
  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStartDate, filterEndDate]);

  // Client-side filtering for User and Product
  // (We fetch by Date from server, then filter by Name locally)
  const filteredData = reports.filter((row) => {
    const matchesUser = filterUser
      ? row.user.toLowerCase().includes(filterUser.toLowerCase())
      : true;
    const matchesProduct = filterProduct
      ? row.product.toLowerCase().includes(filterProduct.toLowerCase())
      : true;
    
    return matchesUser && matchesProduct;
  });

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <h1 className="text-3xl font-bold mb-4 text-center">Production Report</h1>

      {/* Filter Form */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
        <div>
          <label className="block text-xs mb-1 text-gray-400">From Date</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="border border-gray-700 p-2 rounded bg-gray-800 text-white"
          />
        </div>
        <div>
           <label className="block text-xs mb-1 text-gray-400">To Date</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="border border-gray-700 p-2 rounded bg-gray-800 text-white"
          />
        </div>
        <div>
           <label className="block text-xs mb-1 text-gray-400">Filter by User</label>
          <input
            type="text"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="border border-gray-700 p-2 rounded bg-gray-800 text-white"
            placeholder="Employee ID..."
          />
        </div>
        <div>
           <label className="block text-xs mb-1 text-gray-400">Filter by Product</label>
          <input
            type="text"
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="border border-gray-700 p-2 rounded bg-gray-800 text-white"
            placeholder="Product name..."
          />
        </div>
        {/* Optional Manual Refresh Button */}
        <div className="flex items-end">
          <button 
            onClick={fetchReports} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Report Table */}
      <div className="overflow-x-auto rounded shadow-lg">
        <table className="min-w-full border-collapse border border-gray-700 bg-gray-800">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Task</th>
              <th className="px-4 py-3 text-left">Quantity</th>
              <th className="px-4 py-3 text-left">Time Worked</th>
              <th className="px-4 py-3 text-left">BOM Cost</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading data...
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No data found for these filters.
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-700 border-t border-gray-700 transition">
                  <td className="px-4 py-2">{row.date}</td>
                  <td className="px-4 py-2">{row.user}</td>
                  <td className="px-4 py-2">{row.task}</td>
                  <td className="px-4 py-2 font-mono">{row.quantity}</td>
                  <td className="px-4 py-2">{row.timeWorked}</td>
                  <td className="px-4 py-2 text-green-400 font-mono">${Number(row.bomCost).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {error && (
        <p className="text-red-500 text-center mt-4 font-semibold bg-red-900/20 p-2 rounded border border-red-500/50">
          {error}
        </p>
      )}
    </div>
  );
}