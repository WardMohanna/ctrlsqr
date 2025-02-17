"use client";

import React, { useState, useEffect } from "react";
import Select from "react-select";

export default function AddInventoryItem() {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: ["minQuantity", "quantity", "clientPrice", "businessPrice"].includes(name)
        ? Number(value) || 0
        : value
    });
    setErrors({ ...errors, [name]: "" });
  };

  const handleCategoryChange = (selectedOption) => {
    setFormData({ ...formData, category: selectedOption, components: [] });
    setErrors({ ...errors, category: "" });
  };

  const handleUnitChange = (selectedOption) => {
    setFormData({ ...formData, unit: selectedOption });
  };

  const handleComponentChange = (selectedOption) => {
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

  const handleWeightChange = (index, weight) => {
    const updatedComponents = [...formData.components];
    updatedComponents[index].weight = weight;
    setFormData({ ...formData, components: updatedComponents });
  };

  const rawMaterials = inventoryItems
    .filter((item) => item.category === "ProductionRawMaterial")
    .map((item) => ({ value: item._id, label: item.itemName }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
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
    <div className="min-h-screen bg-gradient-to-r from-blue-50 to-blue-100 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-3xl">
        <h1 className="text-3xl font-bold mb-8 text-center text-blue-600">Add Inventory Item</h1>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">SKU</label>
            <input
              className="p-3 border border-gray-300 rounded-lg w-full"
              name="sku"
              placeholder="Enter SKU"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Item Name</label>
            <input
              className="p-3 border border-gray-300 rounded-lg w-full"
              name="itemName"
              placeholder="Enter Item Name"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Category</label>
            {isMounted ? (
              <Select
                options={categories}
                onChange={handleCategoryChange}
                value={formData.category}
                placeholder="Search & Select Category"
              />
            ) : (
              <div className="p-3 border border-gray-300 rounded-lg w-full bg-gray-100 text-gray-500">
                Loading categories...
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Starting Quantity</label>
            <input
              className="p-3 border border-gray-300 rounded-lg w-full"
              type="number"
              name="quantity"
              placeholder="Enter Quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Unit</label>
            {isMounted ? (
              <Select
                options={units}
                onChange={handleUnitChange}
                value={formData.unit}
                placeholder="Select Unit"
              />
            ) : (
              <div className="p-3 border border-gray-300 rounded-lg w-full bg-gray-100 text-gray-500">
                Loading units...
              </div>
            )}
          </div>

          {(formData.category?.value === "FinalProduct" || formData.category?.value === "SemiFinalProduct") && (
            <div className="col-span-2">
              <h3 className="text-lg font-semibold text-gray-700">Select Components (BOM – Bill Of Materials)</h3>
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
                        <span className="text-gray-800">
                          {item?.itemName || "Unknown"} ({item?.unit || "???"})
                        </span>
                        <input
                          type="number"
                          className="p-2 border border-gray-300 rounded-lg w-20"
                          placeholder="Weight"
                          value={comp.weight}
                          onChange={(e) => handleWeightChange(index, parseFloat(e.target.value))}
                        />
                        <span>{item?.unit || "???"}</span>
                        <button
                          className="text-red-500"
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

          <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700" type="submit">
            Add Item
          </button>
        </form>
      </div>
    </div>
  );
}
