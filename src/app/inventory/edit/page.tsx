"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTheme } from "@/hooks/useTheme";
import { useTranslations } from "next-intl";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { RestoreFormModal } from "@/components/RestoreFormModal";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card,
  Row,
  Col,
  Table,
  Modal,
  message,
  Spin,
  Popconfirm,
  Space,
  Typography,
  Divider,
} from "antd";
import {
  SaveOutlined,
  DeleteOutlined,
  ScanOutlined,
  PlusOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";

const { Title, Text } = Typography;
const { Option } = Select;

const BarcodeScannerModal = dynamic(
  () => import("@/components/BarcodeScannerModal"),
  { ssr: false },
);

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 15;

interface InventoryItem {
  _id: string;
  sku: string;
  barcode?: string;
  itemName: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit?: string;
  currentCostPrice?: number;
  currentClientPrice?: number;
  currentBusinessPrice?: number;
  standardBatchWeight?: number;
  components?: ComponentLineServer[];
}

interface ComponentLineServer {
  componentId: string | { _id: string; itemName: string };
  quantityUsed?: number;
  grams?: number;
}

interface ComponentLine {
  componentId: string;
  grams: number;
}

export default function EditInventoryItem() {
  const router = useRouter();
  const goUp = useNavigateUp();
  const t = useTranslations("inventory.edit");
  const tAdd = useTranslations("inventory.add");
  const { theme } = useTheme();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [components, setComponents] = useState<ComponentLine[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showBOMModal, setShowBOMModal] = useState(false);
  const restoredFormValues = useRef<any>(null);
  const allItemsMap = useMemo(
    () => new Map(allItems.map((item) => [item._id, item])),
    [allItems],
  );

  const mergeUniqueItems = useCallback(
    (currentItems: InventoryItem[], nextItems: InventoryItem[]) => {
      const itemMap = new Map(currentItems.map((item) => [item._id, item]));

      for (const item of nextItems) {
        itemMap.set(item._id, item);
      }

      return Array.from(itemMap.values());
    },
    [],
  );

  const fetchItemSearchResults = useCallback(async (searchTerm = "", page = 1) => {
    const params = new URLSearchParams({
      paginated: "true",
      page: String(page),
      limit: String(PAGE_SIZE),
      fields: "_id,itemName,category",
    });

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    }

    const response = await fetch(`/api/inventory?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to load items");
    }

    const payload = await response.json();
    return {
      items: (payload.items ?? []) as InventoryItem[],
      total: payload.total ?? 0,
      page,
    };
  }, []);

  // Form persistence
  const {
    saveFormData,
    clearSavedData,
    showRestoreModal,
    handleRestoreConfirm,
    handleRestoreCancel,
  } = useFormPersistence({
    formKey: "inventory-edit",
    form,
    additionalData: { selectedItemId, components, selectedCategory },
    onRestore: (data) => {
      if (data.selectedItemId) {
        // Store the restored form values to apply after loading
        restoredFormValues.current = form.getFieldsValue();
        setItemsLoading(true);
        fetchItemSearchResults()
          .then((payload) => {
            setAllItems(payload.items);
            setItemsPage(payload.page);
            setItemSearchTerm("");
            setHasMoreItems(payload.page * PAGE_SIZE < payload.total);
            return handleSelectItem(data.selectedItemId, payload.items);
          })
          .catch((err) => {
            console.error("Error loading inventory:", err);
          })
          .finally(() => {
            setItemsLoading(false);
          });
      }
      if (data.components) {
        setComponents(data.components);
      }
      if (data.selectedCategory) {
        setSelectedCategory(data.selectedCategory);
      }
    },
  });

  const loadItemList = useCallback((searchTerm = "", page = 1, append = false) => {
    if (itemsLoading) {
      return;
    }

    setItemsLoading(true);
    fetchItemSearchResults(searchTerm, page)
      .then((payload) => {
        setAllItems((currentItems) =>
          append ? mergeUniqueItems(currentItems, payload.items) : payload.items,
        );
        setItemsPage(payload.page);
        setItemSearchTerm(searchTerm);
        setHasMoreItems(payload.page * PAGE_SIZE < payload.total);
      })
      .catch((err) => {
        console.error("Error loading inventory for edit page:", err);
        messageApi.error(t("errorLoadingItems") || "Failed to load items");
      })
      .finally(() => {
        setItemsLoading(false);
      });
  }, [fetchItemSearchResults, itemsLoading, mergeUniqueItems, messageApi, t]);

  const handleItemSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadItemList(value, 1, false);
    }, SEARCH_DEBOUNCE_MS);
  }, [loadItemList]);

  const handleItemPopupScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.target as HTMLDivElement;
      const isNearBottom =
        target.scrollTop + target.clientHeight >= target.scrollHeight - 24;

      if (!isNearBottom || itemsLoading || !hasMoreItems) {
        return;
      }

      loadItemList(itemSearchTerm, itemsPage + 1, true);
    },
    [hasMoreItems, itemSearchTerm, itemsLoading, itemsPage, loadItemList],
  );

  // Category + Unit options
  const categories = [
    {
      value: "ProductionRawMaterial",
      label: t("categoryOptions.ProductionRawMaterial"),
    },
    {
      value: "CoffeeshopRawMaterial",
      label: t("categoryOptions.CoffeeshopRawMaterial"),
    },
    { value: "CleaningMaterial", label: t("categoryOptions.CleaningMaterial") },
    { value: "Packaging", label: t("categoryOptions.Packaging") },
    {
      value: "DisposableEquipment",
      label: t("categoryOptions.DisposableEquipment"),
    },
    { value: "SemiFinalProduct", label: t("categoryOptions.SemiFinalProduct") },
    { value: "FinalProduct", label: t("categoryOptions.FinalProduct") },
  ];

  const units = [
    { value: "grams", label: t("unitOptions.grams") },
    { value: "kg", label: t("unitOptions.kg") },
    { value: "ml", label: t("unitOptions.ml") },
    { value: "liters", label: t("unitOptions.liters") },
    { value: "pieces", label: t("unitOptions.pieces") },
  ];

  // BOM references: all categories except Final products (deduplicated by _id)
  const rawMaterials = useMemo(
    () =>
      Array.from(
        new Map(
          allItems
            .filter((item) => item.category !== "FinalProduct")
            .map((item) => [item._id, { value: item._id, label: item.itemName }]),
        ).values(),
      ),
    [allItems],
  );

  const itemOptions = useMemo(
    () => allItems.map((item) => ({ value: item._id, label: item.itemName })),
    [allItems],
  );

  // On item select from dropdown - fetch full item details
  const handleSelectItem = useCallback(async (itemId: string, currentItems = allItems) => {
    if (!itemId) {
      setSelectedItemId("");
      form.resetFields();
      setComponents([]);
      setSelectedCategory("");
      return;
    }

    setLoading(true);
    try {
      // Fetch full item details from API
      const res = await fetch(`/api/inventory/${itemId}`);
      if (!res.ok) throw new Error("Failed to load item");

      const found = await res.json();

      const itemsToCheck = Array.isArray(currentItems) ? currentItems : allItems;

      if (!itemsToCheck.some((item) => item._id === found._id)) {
        setAllItems((prev) => {
          if (prev.some((item) => item._id === found._id)) {
            return prev;
          }
          return [...prev, found];
        });
      }

      setSelectedItemId(itemId);
      setSelectedCategory(found.category);

      // Convert database shape to form values
      const convertedComponents = (found.components || []).map(
        (comp: ComponentLineServer) => ({
          componentId:
            typeof comp.componentId === "string"
              ? comp.componentId
              : (comp.componentId as any)._id,
          grams: comp.quantityUsed ?? comp.grams ?? 0,
        }),
      );

      setComponents(convertedComponents);

      // If we have restored values, use them instead of API values
      if (restoredFormValues.current) {
        form.setFieldsValue(restoredFormValues.current);
        restoredFormValues.current = null; // Clear after applying
      } else {
        form.setFieldsValue({
          _id: found._id,
          sku: found.sku || "",
          barcode: found.barcode || "",
          itemName: found.itemName || "",
          category: found.category,
          quantity: found.quantity || 0,
          minQuantity: found.minQuantity || 0,
          currentClientPrice: found.currentClientPrice || 0,
          currentBusinessPrice: found.currentBusinessPrice || 0,
          currentCostPrice: found.currentCostPrice || 0,
          unit: found.unit || undefined,
          standardBatchWeight: found.standardBatchWeight || 0,
        });
      }

      // Load raw materials for BOM if needed
      if (
        found.category === "FinalProduct" ||
        found.category === "SemiFinalProduct"
      ) {
        const rawRes = await fetch(
          "/api/inventory?category=ProductionRawMaterial,Packaging,SemiFinalProduct&fields=_id,itemName,category,currentCostPrice",
        );
        const rawData = await rawRes.json();
        // Merge without duplicates
        setAllItems((prev) => {
          const existingIds = new Set(prev.map((item) => item._id));
          const newItems = rawData.filter(
            (item: InventoryItem) => !existingIds.has(item._id),
          );
          return [...prev, ...newItems];
        });
      }
    } catch (err) {
      console.error("Error loading item details:", err);
      messageApi.error(t("errorLoadingItems"));
    }
    setLoading(false);
  }, [allItems, form, messageApi, t]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setComponents([]);
    form.setFieldsValue({ standardBatchWeight: 0 });
  };

  // BOM lines
  const handleAddComponent = (componentId: string) => {
    if (!componentId) return;
    if (components.some((c) => c.componentId === componentId)) {
      messageApi.warning(t("errorComponentDuplicate"));
      return;
    }
    const isPackaging = allItemsMap.get(componentId)?.category === "Packaging";
    setComponents([...components, { componentId, grams: isPackaging ? 1 : 0 }]);
  };

  const handleGramsChange = (index: number, grams: number | null) => {
    const updated = [...components];
    updated[index].grams = grams || 0;
    setComponents(updated);
  };

  const handleRemoveLine = (index: number) => {
    const updated = [...components];
    updated.splice(index, 1);
    setComponents(updated);
  };

  // Sum BOM grams except packaging
  const totalBOMGrams = useMemo(
    () =>
      components.reduce((sum, component) => {
        const item = allItemsMap.get(component.componentId);
        return item?.category === "Packaging" ? sum : sum + component.grams;
      }, 0),
    [allItemsMap, components],
  );

  const handlePreviewBOM = () => {
    const itemName = form.getFieldValue("itemName");
    const standardBatchWeight = form.getFieldValue("standardBatchWeight");

    if (!itemName) {
      messageApi.error(t("errorNoItemName"));
      return;
    }
    if (!standardBatchWeight || standardBatchWeight <= 0) {
      messageApi.error(t("errorInvalidBatchWeight"));
      return;
    }
    if (components.length === 0) {
      messageApi.error(t("errorNoComponents"));
      return;
    }
    setShowBOMModal(true);
  };

  // SUBMIT => PUT /api/inventory/[id]
  const handleSubmit = async (values: any) => {
    if (!selectedItemId) {
      messageApi.error(t("errorNoItemSelected"));
      return;
    }

    const catVal = values.category;

    if (["SemiFinalProduct", "FinalProduct"].includes(catVal)) {
      if (!values.standardBatchWeight || values.standardBatchWeight <= 0) {
        messageApi.error(t("errorBatchWeightRequired"));
        return;
      }
      if (totalBOMGrams !== values.standardBatchWeight) {
        messageApi.error(
          t("errorBOMMismatch", {
            total: totalBOMGrams,
            batch: values.standardBatchWeight,
          }),
        );
        return;
      }
    }

    const convertedComponents = components.map((component) => {
      let percentage = 0;
      const batchWeight = values.standardBatchWeight || 0;
      if (["SemiFinalProduct", "FinalProduct"].includes(catVal)) {
        percentage = (component.grams / batchWeight) * 100;
      }
      return {
        componentId: component.componentId,
        percentage,
        quantityUsed: component.grams,
      };
    });

    const dataToSend = {
      sku: values.sku,
      barcode: values.barcode || "",
      itemName: values.itemName,
      category: catVal,
      quantity: values.quantity || 0,
      minQuantity: values.minQuantity || 0,
      unit: values.unit || "",
      currentCostPrice: values.currentCostPrice || 0,
      currentClientPrice: values.currentClientPrice || 0,
      currentBusinessPrice: values.currentBusinessPrice || 0,
      standardBatchWeight: values.standardBatchWeight || 0,
      components: convertedComponents,
    };

    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/${selectedItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });
      const result = await response.json();

      if (!response.ok) {
        messageApi.error(result.message || t("itemUpdateFailure"));
        setLoading(false);
        return;
      }

      clearSavedData();
      messageApi.success(t(result.messageKey || "itemUpdatedSuccess"));
      setTimeout(() => {
        router.push("/mainMenu");
      }, 300);
    } catch (err: any) {
      console.error("Failed to update item:", err);
      messageApi.error(t("itemUpdateFailure"));
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItemId) {
      messageApi.error(t("errorNoItemSelected"));
      return;
    }

    Modal.confirm({
      title: t("confirmDeleteTitle") || "Confirm Delete",
      content:
        t("confirmDeleteMessage") ||
        "Are you sure you want to delete this item?",
      okText: t("confirmDeleteOk") || "Delete",
      okType: "danger",
      cancelText: t("confirmDeleteCancel") || "Cancel",
      onOk: async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/inventory/${selectedItemId}`, {
            method: "DELETE",
          });
          const result = await response.json();

          if (!response.ok) {
            messageApi.error(result.message || t("itemDeleteFailure"));
            setLoading(false);
            return;
          }

          messageApi.success(t("itemDeletedSuccess"));
          setTimeout(() => {
            router.push("/mainMenu");
          }, 300);
        } catch (err: any) {
          console.error("Failed to delete item:", err);
          messageApi.error(t("itemDeleteFailure"));
          setLoading(false);
        }
      },
    });
  };

  // BOM table columns
  const bomColumns = [
    {
      title: t("componentLabel"),
      dataIndex: "componentId",
      key: "componentId",
      render: (componentId: string) => {
        const item = allItems.find((inv) => inv._id === componentId);
        return item?.itemName || t("unknownComponent");
      },
    },
    {
      title: t("gramsLabel"),
      dataIndex: "grams",
      key: "grams",
      render: (_: any, record: ComponentLine, index: number) => (
        <InputNumber
          min={0}
          step={0.01}
          value={record.grams}
          onChange={(value) => handleGramsChange(index, value)}
          style={{ width: "100%" }}
          placeholder={t("gramsPlaceholder")}
        />
      ),
    },
    {
      title: t("actionLabel"),
      key: "action",
      render: (_: any, record: ComponentLine, index: number) => (
        <Popconfirm
          title={t("confirmRemoveComponent") || "Remove this component?"}
          onConfirm={() => handleRemoveLine(index)}
          okText={t("yes") || "Yes"}
          cancelText={t("no") || "No"}
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            {t("removeBOMProduct")}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const showBOMFields = ["SemiFinalProduct", "FinalProduct"].includes(
    selectedCategory,
  );
  const showCostPrice = [
    "ProductionRawMaterial",
    "CoffeeshopRawMaterial",
    "CleaningMaterial",
    "Packaging",
    "DisposableEquipment",
  ].includes(selectedCategory);
  const showFinalPrices = selectedCategory === "FinalProduct";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1200px", margin: "0 auto 16px" }}>
        <BackButton onClick={goUp}>{t("back")}</BackButton>
      </div>
      <Card
        style={{ maxWidth: "1200px", margin: "0 auto" }}
        title={
          <Title level={2} style={{ margin: 0 }}>
            {t("title")}
          </Title>
        }
      >
        <Spin spinning={loading}>
          {/* Select item to edit */}
          <Form.Item
            label={<Text strong>{t("selectItemToEdit")}</Text>}
            style={{ marginBottom: "24px" }}
          >
            <Select
              showSearch
              placeholder={
                itemsLoading
                  ? t("loadingItems") || "Loading items..."
                  : t("selectItemPlaceholder")
              }
              loading={itemsLoading}
              options={itemOptions}
              value={selectedItemId || undefined}
              onChange={(value) => handleSelectItem(value)}
              onFocus={() => {
                if (allItems.length === 0) {
                  loadItemList("", 1, false);
                }
              }}
              onPopupScroll={handleItemPopupScroll}
              onSearch={handleItemSearch}
              style={{ width: "100%" }}
              filterOption={false}
              notFoundContent={
                itemsLoading
                  ? t("loadingItems")
                  : t("noItemsFound") || "No items found"
              }
            />
          </Form.Item>

          {/* Show the edit form only if an item is selected */}
          {selectedItemId && (
            <>
              <Divider />
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                onValuesChange={saveFormData}
                disabled={loading}
                initialValues={{
                  quantity: 0,
                  minQuantity: 0,
                  currentCostPrice: 0,
                  currentClientPrice: 0,
                  currentBusinessPrice: 0,
                  standardBatchWeight: 0,
                }}
              >
                <Row gutter={16}>
                  {/* SKU */}
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t("skuLabel")}
                      name="sku"
                      rules={[
                        { required: true, message: t("errorSKURequired") },
                      ]}
                    >
                      <Input placeholder={t("skuPlaceholder")} />
                    </Form.Item>
                  </Col>

                  {/* Barcode + Scan */}
                  <Col xs={24} md={12}>
                    <Form.Item label={t("barcodeLabel")}>
                      <Space.Compact style={{ width: "100%" }}>
                        <Form.Item name="barcode" noStyle>
                          <Input
                            placeholder={t("barcodePlaceholder")}
                            style={{ flex: 1 }}
                          />
                        </Form.Item>
                        <Button
                          icon={<ScanOutlined />}
                          onClick={() => setIsScannerOpen(true)}
                        >
                          {t("scan")}
                        </Button>
                      </Space.Compact>
                    </Form.Item>
                  </Col>

                  {/* Item Name */}
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t("itemNameLabel")}
                      name="itemName"
                      rules={[
                        { required: true, message: t("errorItemNameRequired") },
                      ]}
                    >
                      <Input placeholder={t("itemNamePlaceholder")} />
                    </Form.Item>
                  </Col>

                  {/* Category */}
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t("categoryLabel")}
                      name="category"
                      rules={[
                        { required: true, message: t("errorCategoryRequired") },
                      ]}
                    >
                      <Select
                        placeholder={t("categoryPlaceholder")}
                        onChange={handleCategoryChange}
                      >
                        {categories.map((cat) => (
                          <Option key={cat.value} value={cat.value}>
                            {cat.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>

                  {/* Quantity */}
                  <Col xs={24} md={12}>
                    <Form.Item label={t("quantityLabel")} name="quantity">
                      <InputNumber
                        min={0}
                        step={0.01}
                        style={{ width: "100%" }}
                        placeholder={t("quantityPlaceholder")}
                      />
                    </Form.Item>
                  </Col>

                  {/* Unit */}
                  <Col xs={24} md={12}>
                    <Form.Item label={t("unitLabel")} name="unit">
                      <Select placeholder={t("unitPlaceholder")}>
                        {units.map((unit) => (
                          <Option key={unit.value} value={unit.value}>
                            {unit.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>

                  {/* Min Quantity */}
                  <Col xs={24} md={12}>
                    <Form.Item label={t("minQuantityLabel")} name="minQuantity">
                      <InputNumber
                        min={0}
                        step={0.01}
                        style={{ width: "100%" }}
                        placeholder={t("minQuantityPlaceholder")}
                      />
                    </Form.Item>
                  </Col>

                  {/* Cost Price if rawMaterial, packaging, etc. */}
                  {showCostPrice && (
                    <Col xs={24} md={12}>
                      <Form.Item
                        label={t("costPriceLabel")}
                        name="currentCostPrice"
                      >
                        <InputNumber
                          min={0}
                          step={0.01}
                          style={{ width: "100%" }}
                          placeholder={t("costPricePlaceholder")}
                        />
                      </Form.Item>
                    </Col>
                  )}

                  {/* If Final => show Business Price + Client Price */}
                  {showFinalPrices && (
                    <>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label={t("businessPriceLabel")}
                          name="currentBusinessPrice"
                        >
                          <InputNumber
                            min={0}
                            step={0.01}
                            style={{ width: "100%" }}
                            placeholder={t("businessPricePlaceholder")}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label={t("clientPriceLabel")}
                          name="currentClientPrice"
                        >
                          <InputNumber
                            min={0}
                            step={0.01}
                            style={{ width: "100%" }}
                            placeholder={t("clientPricePlaceholder")}
                          />
                        </Form.Item>
                      </Col>
                    </>
                  )}

                  {/* If semi/final => BOM */}
                  {showBOMFields && (
                    <>
                      <Col span={24}>
                        <Form.Item
                          label={t("standardBatchWeightLabel")}
                          name="standardBatchWeight"
                          rules={[
                            {
                              required: true,
                              message: t("errorBatchWeightRequired"),
                            },
                          ]}
                        >
                          <InputNumber
                            min={0}
                            step={0.01}
                            style={{ width: "100%" }}
                            placeholder={t("standardBatchWeightPlaceholder")}
                          />
                        </Form.Item>
                      </Col>

                      <Col span={24}>
                        <Card
                          type="inner"
                          title={<Text strong>{t("bomTitle")}</Text>}
                          style={{ marginBottom: "16px" }}
                        >
                          <Space
                            orientation="vertical"
                            style={{ width: "100%" }}
                            size="middle"
                          >
                            <Space.Compact style={{ width: "100%" }}>
                              <Select
                                showSearch
                                placeholder={t("bomSelectPlaceholder")}
                                onChange={handleAddComponent}
                                value={undefined}
                                style={{ flex: 1 }}
                                filterOption={(input, option) => {
                                  const searchWords = input.toLowerCase().split(/\s+/).filter(Boolean);
                                  if (searchWords.length === 0) return true;
                                  const label =
                                    typeof option?.children === "string"
                                      ? option.children
                                      : "";
                                  return searchWords.every((word) => label.toLowerCase().includes(word));
                                }}
                              >
                                {rawMaterials.map((rm) => (
                                  <Option key={rm.value} value={rm.value}>
                                    {rm.label}
                                  </Option>
                                ))}
                              </Select>
                              <Button type="primary" icon={<PlusOutlined />}>
                                {t("add") || "Add"}
                              </Button>
                            </Space.Compact>

                            <Text type="secondary">
                              {t("bomAddMaterialNote")}
                            </Text>

                            {components.length > 0 && (
                              <>
                                <Table
                                  dataSource={components}
                                  columns={bomColumns}
                                  pagination={false}
                                  rowKey="componentId"
                                  size="small"
                                />

                                <Text strong>
                                  {t("totalBOMGramsLabel", {
                                    bomtotal: totalBOMGrams.toString(),
                                  })}
                                </Text>

                                <Button
                                  type="default"
                                  icon={<EyeOutlined />}
                                  onClick={handlePreviewBOM}
                                >
                                  {t("bomPreview")}
                                </Button>
                              </>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    </>
                  )}
                </Row>

                <Divider />

                {/* Action Buttons */}
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      block
                      size="large"
                      loading={loading}
                    >
                      {t("saveChanges")}
                    </Button>
                  </Col>
                  <Col xs={24} md={12}>
                    <Popconfirm
                      title={t("confirmDeleteTitle") || "Delete this item?"}
                      description={
                        t("confirmDeleteMessage") ||
                        "This action cannot be undone"
                      }
                      onConfirm={handleDelete}
                      okText={t("confirmDeleteOk") || "Delete"}
                      cancelText={t("confirmDeleteCancel") || "Cancel"}
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        block
                        size="large"
                        disabled={loading}
                      >
                        {t("confirmDeleteOk") || "Delete Item"}
                      </Button>
                    </Popconfirm>
                  </Col>
                </Row>
              </Form>
            </>
          )}
        </Spin>
      </Card>

      <BarcodeScannerModal
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={(barcode) => {
          form.setFieldsValue({ barcode });
          form.setFieldValue("barcode", barcode);
          saveFormData();
        }}
        translationNamespace="inventory.edit"
      />

      {/* BOM PREVIEW MODAL */}
      {showBOMModal && (
        <BOMPreviewModal
          open={showBOMModal}
          onClose={() => setShowBOMModal(false)}
          itemName={form.getFieldValue("itemName")}
          standardBatchWeight={form.getFieldValue("standardBatchWeight")}
          components={components}
          inventoryItems={allItems}
          t={t}
        />
      )}

      <RestoreFormModal
        open={showRestoreModal}
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
        translationKey="inventory.edit"
      />
    </div>
  );
}

// BOM PREVIEW MODAL
function BOMPreviewModal({
  open,
  onClose,
  itemName,
  standardBatchWeight,
  components,
  inventoryItems,
  t,
}: {
  open: boolean;
  onClose: () => void;
  itemName: string;
  standardBatchWeight: number;
  components: ComponentLine[];
  inventoryItems: InventoryItem[];
  t: any;
}) {
  const batchWeightNum = standardBatchWeight || 0;

  // Compute total cost
  const totalCost = components.reduce((acc, comp) => {
    const rm = inventoryItems.find((i) => i._id === comp.componentId);
    if (!rm) return acc;
    if (rm.category === "Packaging") {
      return acc + (rm.currentCostPrice || 0) * comp.grams;
    }
    // else per-gram cost
    return acc + ((rm.currentCostPrice || 0) / 1000) * comp.grams;
  }, 0);

  const columns = [
    {
      title: t("componentLabel"),
      dataIndex: "componentId",
      key: "componentId",
      render: (componentId: string) => {
        const rm = inventoryItems.find((i) => i._id === componentId);
        return <Text strong>{rm?.itemName || t("unknownComponent")}</Text>;
      },
    },
    {
      title: t("weightUsed"),
      key: "weightUsed",
      render: (_: any, record: ComponentLine) => {
        const rm = inventoryItems.find((i) => i._id === record.componentId);
        return rm?.category === "Packaging"
          ? `${record.grams} pc`
          : `${record.grams} g`;
      },
    },
    {
      title: t("percentage"),
      key: "percentage",
      render: (_: any, record: ComponentLine) => {
        const rm = inventoryItems.find((i) => i._id === record.componentId);
        if (rm?.category === "Packaging") return "—";
        const fraction = batchWeightNum ? record.grams / batchWeightNum : 0;
        return `${(fraction * 100).toFixed(2)}%`;
      },
    },
    {
      title: t("partialCost"),
      key: "partialCost",
      render: (_: any, record: ComponentLine) => {
        const rm = inventoryItems.find((i) => i._id === record.componentId);
        const cost = rm?.currentCostPrice || 0;
        const partialCost =
          rm?.category === "Packaging"
            ? cost * record.grams
            : (cost / 1000) * record.grams;
        return `₪${partialCost.toFixed(2)}`;
      },
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={`${t("bomFor")} ${itemName || t("nA")}`}
      width={900}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <Text>
          <Text strong>{t("productWeightLabel")}:</Text> {batchWeightNum} g
        </Text>

        <Table
          dataSource={components}
          columns={columns}
          pagination={false}
          rowKey="componentId"
          size="small"
        />

        <div style={{ textAlign: "right" }}>
          <Text strong style={{ fontSize: "16px" }}>
            {t("bomTotalCost")} ₪{totalCost.toFixed(2)}
          </Text>
        </div>
      </Space>
    </Modal>
  );
}
