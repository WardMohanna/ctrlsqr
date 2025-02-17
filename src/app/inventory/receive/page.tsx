'use client';

import React, { useState } from "react";

export default function ReceiveInventory() {
  const [file, setFile] = useState<File | null>(null);
  const [supplier, setSupplier] = useState("");
  const [documentType, setDocumentType] = useState(""); // 🔹 נוסיף את שדה הבחירה
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const suppliers = ["Supplier A", "Supplier B", "Supplier C"]; // נתונים לדוגמה
  const documentTypes = ["Invoice", "DeliveryNote"]; // 🔹 רשימת סוגי מסמכים

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile)); // יצירת תצוגה מקדימה
    }
  };

  const handleUpload = async () => {
    if (!file || !supplier || !documentType) {
      alert("❌ Please select a file, a supplier, and a document type.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType); // ✅ עכשיו המסמך נשלח
    formData.append("supplierName", supplier); // ✅ נשלח שם הספק

    console.log("📤 Sending FormData:", {
      file: file.name,
      documentType,
      supplier,
    });

    try {
      const response = await fetch("/api/inventory/upload-invoice", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("📥 Server Response:", data); // ✅ בדיקה מה השרת מחזיר

      if (response.ok) {
        setUploadStatus("✅ File uploaded successfully!");
      } else {
        setUploadStatus(`❌ Upload failed: ${data.error}`);
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      setUploadStatus("❌ Upload failed due to network error.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">Receive Inventory</h1>
        
        {/* בחירת ספק */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-1">Select Supplier</label>
          <select
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setSupplier(e.target.value)}
            value={supplier}
          >
            <option value="">Choose Supplier</option>
            {suppliers.map((sup, index) => (
              <option key={index} value={sup}>
                {sup}
              </option>
            ))}
          </select>
        </div>

        {/* בחירת סוג מסמך */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-1">Select Document Type</label>
          <select
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setDocumentType(e.target.value)}
            value={documentType}
          >
            <option value="">Choose Document Type</option>
            {documentTypes.map((type, index) => (
              <option key={index} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* העלאת קובץ */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-1">Upload Invoice/Delivery Note</label>
          <input type="file" className="w-full p-2 border rounded-lg" onChange={handleFileChange} />
        </div>

        {/* תצוגה מקדימה של הקובץ */}
        {filePreview && (
          <div className="mb-4 text-center">
            <p className="text-gray-600">File Preview:</p>
            <iframe
              src={filePreview}
              className="w-full h-40 border rounded-lg"
              title="Invoice Preview"
            />
          </div>
        )}

        {/* כפתור העלאה */}
        <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition" onClick={handleUpload}>
          Upload File
        </button>

        {/* הצגת סטטוס העלאה */}
        {uploadStatus && <p className="mt-4 text-center">{uploadStatus}</p>}
      </div>
    </div>
  );
}
