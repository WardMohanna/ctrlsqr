"use client";

import React, { useState, useEffect } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";

export default function AddInventoryItem() {
  const router = useRouter(); // כפתור חזרה

  const [formData, setFormData] = useState({
    sku: "",
    itemName: "",
    category: null,
    quantity: 0,
    minQuantity: 0,
    barcode: "",
    clientPrice: "",
    businessPrice: "",
    components: [],
    unit: null
  });

  const [errors, setErrors] = useState({});
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => setInventoryItems(data));
  }, []);

  const categories = [
    { value: "ProductionRawMaterial", label: "Production Raw Material" },
    { value: "CoffeeshopRawMaterial", label: "Coffeeshop Raw Material" },
    { value: "CleaningMaterial", label: "Cleaning Material" },
    { value: "Packaging", label: "Packaging" },
    { value: "DisposableEquipment", label: "Disposable Equipment" },
    { value: "SemiFinalProduct", label: "Semi-Final Product" },
    { value: "FinalProduct", label: "Final Product" }
  ];

  const units = [
    { value: "grams", label: "Grams (g)" },
    { value: "kg", label: "Kilograms (kg)" },
    { value: "ml", label: "Milliliters (ml)" },
    { value: "liters", label: "Liters (L)" },
    { value: "pieces", label: "Pieces" }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: ["minQuantity", "quantity", "clientPrice", "businessPrice"].includes(name)
        ? Number(value) || 0
        : value
    });
    setErrors({ ...errors, [name]: "" });
  };

  const handleCategoryChange = (selectedOption: any) => {
    setFormData({ ...formData, category: selectedOption, components: [] });
    setErrors({ ...errors, category: "" });
  };

  const handleUnitChange = (selectedOption: any) => {
    setFormData({ ...formData, unit: selectedOption });
  };

  const handleComponentChange = (selectedOption: any) => {
    if (!selectedOption) return;
    if (formData.components.some((comp) => comp.componentId === selectedOption.value)) {
      alert("This component is already added!");
      return;
    }
    setFormData({
      ...formData,
      components: [...formData.components, { componentId: selectedOption.value, weight: 0 }]
    });
  };

  const handleWeightChange = (index: number, weight: number) => {
    const updatedComponents = [...formData.components];
    updatedComponents[index].weight = weight;
    setFormData({ ...formData, components: updatedComponents });
  };

  const rawMaterials = inventoryItems
    .filter((item) => item.category === "ProductionRawMaterial")
    .map((item) => ({ value: item._id, label: item.itemName }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};
    if (!formData.sku) newErrors.sku = "SKU is required.";
    if (!formData.itemName) newErrors.itemName = "Item name is required.";
    if (!formData.category) newErrors.category = "Category is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const formattedData = {
      ...formData,
      category: formData.category.value,
      unit: formData.unit?.value || null,
      components: formData.components.map((comp) => ({
        componentId: comp.componentId,
        weight: comp.weight
      }))
    };

    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formattedData)
    });

    const result = await response.json();
    alert(result.message);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-6">
      
      <div className="bg-gray-900 p-10 rounded-2xl shadow-lg shadow-gray-900/50 w-full max-w-3xl border border-gray-700">
        
        {/* כפתור חזרה לעמוד הקודם */}
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">Add Inventory Item</h1>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SKU */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">SKU</label>
            <input
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              name="sku"
              placeholder="Enter SKU"
              onChange={handleChange}
              required
            />
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Item Name</label>
            <input
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              name="itemName"
              placeholder="Enter Item Name"
              onChange={handleChange}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Category</label>
            {isMounted ? (
              <Select
                options={categories}
                onChange={handleCategoryChange}
                value={formData.category}
                placeholder="Search & Select Category"
              />
            ) : (
              <div className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-gray-400">
                Loading categories...
              </div>
            )}
          </div>

          {/* Starting Quantity */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Starting Quantity</label>
            <input
              className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-white"
              type="number"
              name="quantity"
              placeholder="Enter Quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Unit</label>
            {isMounted ? (
              <Select
                options={units}
                onChange={handleUnitChange}
                value={formData.unit}
                placeholder="Select Unit"
              />
            ) : (
              <div className="p-3 border border-gray-600 rounded-lg w-full bg-gray-800 text-gray-400">
                Loading units...
              </div>
            )}
          </div>

          {/* BOM (אם הקטגוריה היא Final או SemiFinal) */}
          {(formData.category?.value === "FinalProduct" || formData.category?.value === "SemiFinalProduct") && (
            <div className="col-span-2">
              <h3 className="text-lg font-semibold text-gray-300">Select Components (BOM – Bill Of Materials)</h3>
              <Select
                options={rawMaterials}
                onChange={handleComponentChange}
                placeholder="Search and Select Component"
                isSearchable
              />
              {formData.components.length > 0 && (
                <div className="mt-4">
                  {formData.components.map((comp, index) => {
                    const item = inventoryItems.find((i) => i._id === comp.componentId);
                    return (
                      <div key={comp.componentId} className="flex items-center gap-4 my-2">
                        <span className="text-gray-200">
                          {item?.itemName || "Unknown"} ({item?.unit || "???"})
                        </span>
                        <input
                          type="number"
                          className="p-2 border border-gray-600 rounded-lg w-20 bg-gray-800 text-white"
                          placeholder="Weight"
                          value={comp.weight}
                          onChange={(e) => handleWeightChange(index, parseFloat(e.target.value))}
                        />
                        <span className="text-gray-300">{item?.unit || "???"}</span>
                        <button
                          className="text-red-400 hover:text-red-600"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              components: formData.components.filter(
                                (c) => c.componentId !== comp.componentId
                              )
                            })
                          }
                        >
                          ❌ Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* כפתור הוספה */}
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700" type="submit">
            Add Item
          </button>
        </form>
      </div>
    </div>
  );
}
