"use client";

import React, { useState, useEffect } from "react";

interface ReportRow {
  date: string; // ISO date string (YYYY-MM-DD)
  task: string;
  quantity: number;
  timeWorked: string; // e.g., "2h 15m"
  bomCost: number; // cost in dollars
  user: string;
  product: string;
}

export default function ProductionReportPage() {
  // Compute today's and tomorrow's dates as strings.
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Use state for the report data from the backend.
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Default filters.
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterProduct, setFilterProduct] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>(todayStr);
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  // Fetch reports from the backend API.
  const fetchReports = async () => {
    try {
      const res = await fetch("/api/report", { method: "GET" });
      if (!res.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = await res.json();
      // Assuming the response returns an object { report: ReportRow[] }.
      setReports(data.report || data);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      setError("Error fetching reports");
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filtering logic: Only include rows that match each filter (if set).
  const filteredData = reports.filter((row) => {
    const matchesUser = filterUser
      ? row.user.toLowerCase().includes(filterUser.toLowerCase())
      : true;
    const matchesProduct = filterProduct
      ? row.product.toLowerCase().includes(filterProduct.toLowerCase())
      : true;
    const matchesStartDate = filterStartDate ? row.date >= filterStartDate : true;
    const matchesEndDate = filterEndDate ? row.date <= filterEndDate : true;
    return matchesUser && matchesProduct && matchesStartDate && matchesEndDate;
  });

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <h1 className="text-3xl font-bold mb-4 text-center">Production Report</h1>

      {/* Filter Form */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-center">
        <div>
          <label className="mr-2">Filter by User:</label>
          <input
            type="text"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="border border-gray-700 p-1 bg-gray-800 text-white"
            placeholder="Employee ID"
          />
        </div>
        <div>
          <label className="mr-2">Filter by Product:</label>
          <input
            type="text"
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="border border-gray-700 p-1 bg-gray-800 text-white"
            placeholder="Product name"
          />
        </div>
        <div>
          <label className="mr-2">From Date:</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="border border-gray-700 p-1 bg-gray-800 text-white"
          />
        </div>
        <div>
          <label className="mr-2">To Date:</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="border border-gray-700 p-1 bg-gray-800 text-white"
          />
        </div>
      </div>

      {/* Report Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="border border-gray-700 px-4 py-2">Date</th>
              <th className="border border-gray-700 px-4 py-2">User</th>
              <th className="border border-gray-700 px-4 py-2">Task</th>
              <th className="border border-gray-700 px-4 py-2">Quantity</th>
              <th className="border border-gray-700 px-4 py-2">Time Worked</th>
              <th className="border border-gray-700 px-4 py-2">BOM Material Cost</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td
                  className="border border-gray-700 px-4 py-2 text-center"
                  colSpan={6}
                >
                  No data available.
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-700">
                  <td className="border border-gray-700 px-4 py-2">{row.date}</td>
                  <td className="border border-gray-700 px-4 py-2">{row.user}</td>
                  <td className="border border-gray-700 px-4 py-2">{row.task}</td>
                  <td className="border border-gray-700 px-4 py-2">{row.quantity}</td>
                  <td className="border border-gray-700 px-4 py-2">{row.timeWorked}</td>
                  <td className="border border-gray-700 px-4 py-2">${row.bomCost.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {error && (
        <p className="text-red-500 text-center mt-4 font-semibold">{error}</p>
      )}
    </div>
  );
}
