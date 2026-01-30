"use client";

import React, { useState, useEffect, Suspense } from "react"; // 1. Import Suspense
import InventoryAddForm from "@/components/InventoryAddForm";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { RestoreFormModal } from "@/components/RestoreFormModal";
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Upload,
  Button,
  Card,
  Row,
  Col,
  Steps,
  Radio,
  Table,
  message,
  Modal,
  Typography,
  Divider,
  Space,
  Checkbox,
  Spin, // 2. Import Spin for loading state
} from "antd";
import {
  UploadOutlined,
  SaveOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  InboxOutlined,
  EditOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import dayjs, { Dayjs } from "dayjs";

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Dragger } = Upload;

// ... [Keep your Types interfaces here: Supplier, InventoryItem, etc.] ...
interface Supplier {
  _id: string;
  name: string;
}

interface InventoryItem {
  _id: string;
  sku: string;
  itemName: string;
  unit: string;
  currentCostPrice?: number;
}

interface LineItem {
  inventoryItemId: string;
  sku: string;
  itemName: string;
  quantity: number;
  unit: string;
  cost: number; // stored EX VAT
  originalPrice?: number;
  isNonSupplierPrice?: boolean;
}

interface BOMFormData {
  itemName: string;
  standardBatchWeight: number;
  components: { componentId: string; grams: number }[];
}

// ------------------------------------------------------------------
// 3. RENAME your main logic component to "ReceiveInventoryContent"
//    (Remove 'export default' from here)
// ------------------------------------------------------------------
function ReceiveInventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); // This causes the issue if not suspended
  const t = useTranslations("inventory.receive");
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // ... [PASTE ALL YOUR EXISTING LOGIC AND STATE HERE] ...
  // ... [Keep everything exactly as it was inside your original function] ...

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [useOneTimeSupplier, setUseOneTimeSupplier] = useState(false);
  const [oneTimeSupplierName, setOneTimeSupplierName] = useState("");
  const [useNonSupplierPrice, setUseNonSupplierPrice] = useState(false);
  const [nonSupplierPriceExVat, setNonSupplierPriceExVat] = useState(0);
  const [nonSupplierPriceIncVat, setNonSupplierPriceIncVat] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [officialDocId, setOfficialDocId] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [documentDate, setDocumentDate] = useState<Dayjs | null>(null);
  const [receivedDate] = useState<Date>(new Date());
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [documentType, setDocumentType] = useState<"Invoice" | "DeliveryNote">(
    "Invoice",
  );
  const [items, setItems] = useState<LineItem[]>([]);
  const [remarks, setRemarks] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [newUnit, setNewUnit] = useState<string>("");
  const VAT_RATE = 0.18;
  const [newCostExVat, setNewCostExVat] = useState<number>(0);
  const [newCostIncVat, setNewCostIncVat] = useState<number>(0);
  const [isCostEditable, setIsCostEditable] = useState<boolean>(false);
  const [lastEditedCostField, setLastEditedCostField] = useState<"ex" | "inc">("ex");
  const [showNewItem, setShowNewItem] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [bomFormData, setBomFormData] = useState<BOMFormData>({
    itemName: "",
    standardBatchWeight: 0,
    components: [],
  });
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form persistence
  const { saveFormData, clearSavedData, showRestoreModal, handleRestoreConfirm, handleRestoreCancel } =
    useFormPersistence({
      formKey: "inventory-receive",
      form,
      additionalData: {
        currentStep,
        useOneTimeSupplier,
        oneTimeSupplierName,
        supplierId,
        officialDocId,
        deliveredBy,
        documentDate: documentDate ? documentDate.format("YYYY-MM-DD") : null,
        documentType,
        items,
        remarks,
      },
      onRestore: (data) => {
        if (data.currentStep !== undefined) setCurrentStep(data.currentStep);
        if (data.useOneTimeSupplier !== undefined) setUseOneTimeSupplier(data.useOneTimeSupplier);
        if (data.oneTimeSupplierName) setOneTimeSupplierName(data.oneTimeSupplierName);
        if (data.supplierId) setSupplierId(data.supplierId);
        if (data.officialDocId) setOfficialDocId(data.officialDocId);
        if (data.deliveredBy) setDeliveredBy(data.deliveredBy);
        if (data.documentDate) setDocumentDate(dayjs(data.documentDate));
        if (data.documentType) setDocumentType(data.documentType);
        if (data.items) setItems(data.items);
        if (data.remarks) setRemarks(data.remarks);
      },
    });

  // ... [Keep your useEffects, handlers, and return JSX exactly as they were] ...
  // (I am omitting the 300 lines of logic for brevity, but you keep them here)

  useEffect(() => {
    fetch("/api/supplier")
      .then((res) => res.json())
      .then((data: Supplier[]) => setSuppliers(data))
      .catch((err) => {
        console.error(t("errorLoadingSuppliers"), err);
        messageApi.error(t("errorLoadingSuppliers"));
      });

    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data: InventoryItem[]) => {
        setAllItems(data);
        
        // Pre-fill item from URL param
        const itemIdFromUrl = searchParams.get("itemId");
        if (itemIdFromUrl) {
          const matchedItem = data.find((it: InventoryItem) => it._id === itemIdFromUrl);
          if (matchedItem) {
            setSelectedItemId(matchedItem._id);
            setNewUnit(matchedItem.unit || "");
            const base = matchedItem.currentCostPrice ?? 0;
            setNewCostExVat(base);
            setNewCostIncVat(Number((base * (1 + VAT_RATE)).toFixed(2)));
          }
        }
      })
      .catch((err) => {
        console.error(t("errorLoadingItems"), err);
        messageApi.error(t("errorLoadingItems"));
      });
  }, [t, searchParams, messageApi]);

  // ... (Insert the rest of your original component code here: options, goNextStep, handleAddItem, handleFinalSubmit, render return, etc.) ...

  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: s.name,
  }));
  const itemOptions = allItems.map((it) => ({
    value: it._id,
    label: it.itemName,
  }));

  function goNextStep() {
    const supplierOk = useOneTimeSupplier ? !!oneTimeSupplierName : !!supplierId;
    if (!supplierOk || !officialDocId || !deliveredBy) {
      messageApi.error(t("errorFillStep1"));
      return;
    }
    setCurrentStep(1);
  }

  function goPrevStep() {
    setCurrentStep(0);
  }

  const uploadProps: UploadProps = {
    fileList,
    beforeUpload: (file) => {
      const uploadFile: UploadFile = {
        uid: file.uid,
        name: file.name,
        status: 'done',
        originFileObj: file,
      };
      setFileList((prev) => [...prev, uploadFile]);
      return false;
    },
    onRemove: (file) => {
      setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
    },
    multiple: true,
  };

  function handleAddItem() {
    if (!selectedItemId || newQuantity <= 0 || !newUnit || newCostExVat < 0) {
      messageApi.error(t("errorFillItem"));
      return;
    }

    // For one-time supplier, check if custom price is set and valid
    if (
      useOneTimeSupplier &&
      useNonSupplierPrice &&
      nonSupplierPriceExVat < 0
    ) {
      messageApi.error("Invalid custom price");
      return;
    }

    // For regular supplier, check cost validity
    if (!useOneTimeSupplier && newCostExVat < 0) {
      messageApi.error(t("errorFillItem"));
      return;
    }

    const matchedItem = allItems.find((it) => it._id === selectedItemId);
    if (!matchedItem) {
      messageApi.error(t("errorItemNotFound"));
      return;
    }

    // Determine the price to use
    let priceToUse = newCostExVat;
    let isNonSupplierPrice = false;

    if (useOneTimeSupplier && useNonSupplierPrice) {
      priceToUse = nonSupplierPriceExVat;
      isNonSupplierPrice = true;
    }

    const lineItem: LineItem = {
      inventoryItemId: matchedItem._id,
      sku: matchedItem.sku,
      itemName: matchedItem.itemName,
      quantity: newQuantity,
      unit: newUnit,
      cost: priceToUse,
      originalPrice: matchedItem.currentCostPrice || 0,
      isNonSupplierPrice,
    };
    if (editingIndex !== null) {
      setItems((prev) => {
        const updated = [...prev];
        updated[editingIndex] = lineItem;
        return updated;
      });
      setEditingIndex(null);
      messageApi.success(t("itemUpdated") || "Item updated successfully");
    } else {
      setItems((prev) => [...prev, lineItem]);
      messageApi.success(t("itemAddedSuccess") || "Item added successfully");
    }

    saveFormData();

    setSelectedItemId("");
    setNewQuantity(0);
    setNewUnit("");
    setNewCostExVat(0);
    setNewCostIncVat(0);
    setIsCostEditable(false);
    setUseNonSupplierPrice(false);
    setNonSupplierPriceExVat(0);
    setNonSupplierPriceIncVat(0);
    setLastEditedCostField("ex");
  }

  function handleRemoveLine(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setSelectedItemId("");
      setNewQuantity(0);
      setNewUnit("");
      setNewCostExVat(0);
      setNewCostIncVat(0);
      setIsCostEditable(false);
      setUseNonSupplierPrice(false);
      setNonSupplierPriceExVat(0);
      setNonSupplierPriceIncVat(0);
      setLastEditedCostField("ex");
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
    messageApi.success(t("itemRemovedSuccess") || "Item removed");
    saveFormData();
  }

  function handleEditItem(index: number) {
    const item = items[index];
    setEditingIndex(index);
    setSelectedItemId(item.inventoryItemId);
    setNewQuantity(item.quantity);
    setNewUnit(item.unit);
    setNewCostExVat(item.cost);
    setNewCostIncVat(Number((item.cost * (1 + VAT_RATE)).toFixed(2)));
    if (item.isNonSupplierPrice) {
      setUseNonSupplierPrice(true);
      setNonSupplierPriceExVat(item.cost);
      setNonSupplierPriceIncVat(Number((item.cost * (1 + VAT_RATE)).toFixed(2)));
    } else {
      setUseNonSupplierPrice(false);
    }
    setIsCostEditable(true);
    setLastEditedCostField("ex");
    const formEl = document.getElementById("add-item-form");
    if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCancelEdit() {
    setEditingIndex(null);
    setSelectedItemId("");
    setNewQuantity(0);
    setNewUnit("");
    setNewCostExVat(0);
    setNewCostIncVat(0);
    setIsCostEditable(false);
    setUseNonSupplierPrice(false);
    setNonSupplierPriceExVat(0);
    setNonSupplierPriceIncVat(0);
    setLastEditedCostField("ex");
  }

  const handleItemSelect = (value: string) => {
    if (editingIndex !== null && value !== selectedItemId) setEditingIndex(null);
    setSelectedItemId(value);
    const matchedItem = allItems.find((it) => it._id === value);
    if (matchedItem) {
      setNewUnit(matchedItem.unit || "");
      const base = matchedItem.currentCostPrice ?? 0;
      setNewCostExVat(base);
      setNewCostIncVat(Number((base * (1 + VAT_RATE)).toFixed(2)));
      setIsCostEditable(false);
      setLastEditedCostField("ex");
    } else {
      setNewUnit("");
      setNewCostExVat(0);
      setNewCostIncVat(0);
      setIsCostEditable(false);
      setLastEditedCostField("ex");
    }
  };

  async function handleFinalSubmit() {
    if (items.length === 0) {
      messageApi.error(t("errorNoLineItems"));
      return;
    }

    // Check if officialDocId already exists
    try {
      const checkResponse = await fetch("/api/invoice");
      if (checkResponse.ok) {
        const existingInvoices = await checkResponse.json();
        const isDuplicate = existingInvoices.some(
          (inv: any) => inv.documentId === officialDocId,
        );
        if (isDuplicate) {
          messageApi.error(t("duplicateOfficialDocId"));
          return;
        }
      }
    } catch (err) {
      console.error("Error checking for duplicate document ID:", err);
      // Continue with submission even if check fails
    }

    const formDataObj = new FormData();
    // Handle supplier info
    if (useOneTimeSupplier) {
      formDataObj.append("supplierId", "");
      formDataObj.append("oneTimeSupplier", oneTimeSupplierName);
    } else {
      formDataObj.append("supplierId", supplierId);
      formDataObj.append("oneTimeSupplier", "");
    }

    formDataObj.append("officialDocId", officialDocId);
    formDataObj.append("deliveredBy", deliveredBy);
    formDataObj.append(
      "documentDate",
      documentDate ? documentDate.format("YYYY-MM-DD") : "",
    );
    formDataObj.append("receivedDate", receivedDate.toISOString());
    formDataObj.append("remarks", remarks);
    formDataObj.append("documentType", documentType);
    
    console.log("📎 Client: fileList length:", fileList.length);
    if (fileList.length > 0) {
      fileList.forEach((file) => {
        console.log("📎 Client: Processing file:", file.name, "has originFileObj:", !!file.originFileObj);
        if (file.originFileObj) {
          formDataObj.append("file", file.originFileObj);
          console.log("✅ Client: Appended file:", file.name);
        }
      });
    }
    
    // Debug: Check what's in formData
    console.log("📋 Client: FormData contents:");
    for (let pair of formDataObj.entries()) {
      if (pair[0] === 'file') {
        console.log("  file:", (pair[1] as File).name, (pair[1] as File).size);
      } else {
        console.log(`  ${pair[0]}:`, typeof pair[1] === 'string' ? pair[1].substring(0, 50) : pair[1]);
      }
    }
    
    formDataObj.append("items", JSON.stringify(items));
    try {
      messageApi.loading({
        content: t("submitting") || "Submitting...",
        key: "submit",
      });
      const response = await fetch("/api/invoice", {
        method: "POST",
        body: formDataObj,
      });
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || t("errorCreatingInvoice"));
        } catch (parseError) {
          throw new Error(errorText || `Server Error: ${response.status}`);
        }
      }
      messageApi.destroy("submit");
      messageApi.success(t("invoiceCreatedSuccess"));
      clearSavedData();
      router.push("/mainMenu");
    } catch (err: any) {
      console.error("Error finalizing invoice:", err);
      messageApi.destroy("submit");
      messageApi.error(t("errorFinalizingInvoice") + ": " + err.message);
    }
  }

  const lineItemColumns = [
    {
      title: t("sku"),
      dataIndex: "sku",
      key: "sku",
      render: (text: string) => text || "-",
    },
    { title: t("itemName"), dataIndex: "itemName", key: "itemName" },
    { title: t("quantity"), dataIndex: "quantity", key: "quantity" },
    { title: t("unit"), dataIndex: "unit", key: "unit" },
    {
      title: t("cost"),
      key: "cost",
      render: (_: any, record: LineItem) => (
        <div>
          {record.isNonSupplierPrice && record.originalPrice != null ? (
            <>
              <div style={{ fontWeight: "bold" }}>
                ₪{record.cost.toFixed(2)} (ex) {t("oneTimePrice") || "one-time"}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ₪{(record.cost * (1 + VAT_RATE)).toFixed(2)} (inc)
              </Text>
              <div style={{ marginTop: "4px", color: "#999" }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {t("regularPrice") || "Regular"}: ₪
                  {record.originalPrice.toFixed(2)}
                </Text>
              </div>
            </>
          ) : (
            <>
              <div>₪{record.cost.toFixed(2)} (ex)</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ₪{(record.cost * (1 + VAT_RATE)).toFixed(2)} (inc)
              </Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: t("actions") || "Actions",
      key: "actions",
      render: (_: any, record: LineItem, index: number) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditItem(index)}
            disabled={editingIndex !== null && editingIndex !== index}
          >
            {t("edit") || "Edit"}
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemoveLine(index)}>
            {t("remove")}
          </Button>
        </Space>
      ),
    },
  ];

  const steps = [
    {
      title: t("step1Title") || "Document Info",
      content: t("step1Description") || "Invoice/Delivery details",
    },
    {
      title: t("step2Title") || "Line Items",
      content: t("step2Description") || "Add received items",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "24px" }}>
      {contextHolder}
      <Card style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Button onClick={() => router.back()} style={{ marginBottom: 16 }}>
              <ArrowRightOutlined /> {t("back")}
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              {t("receiveInventoryTitle") || "Receive Inventory"}
            </Title>
          </div>
          <Steps current={currentStep} items={steps} />
          <Divider />
          {currentStep === 0 && (
            <div>
              <Title level={4}>{t("step1Title")}</Title>
              <Form layout="vertical">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t("supplierLabel")}
                      required
                      tooltip={t("supplierTooltip")}
                    >
                      {useOneTimeSupplier ? (
                        <Input
                          placeholder={t("supplierPlaceholder")}
                          value={oneTimeSupplierName}
                          onChange={(e) => {
                            setOneTimeSupplierName(e.target.value);
                            saveFormData();
                          }}
                        />
                      ) : (
                        <Select
                          showSearch
                          placeholder={t("supplierPlaceholder")}
                          options={supplierOptions}
                          value={supplierId || undefined}
                          onChange={(value) => {
                            setSupplierId(value);
                            saveFormData();
                          }}
                          filterOption={(input, option) =>
                            (option?.label ?? "")
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                        />
                      )}
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label=" ">
                      <Checkbox
                        checked={useOneTimeSupplier}
                        onChange={(e) => {
                          setUseOneTimeSupplier(e.target.checked);
                          if (e.target.checked) {
                            setSupplierId("");
                          } else {
                            setOneTimeSupplierName("");
                          }
                          saveFormData();
                        }}
                      >
                        {t("useOneTimeSupplier") || "Use one-time supplier"}
                      </Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label={t("documentTypeLabel")} required>
                      <Radio.Group
                        value={documentType}
                        onChange={(e) => {
                          setDocumentType(e.target.value);
                          saveFormData();
                        }}
                        buttonStyle="solid"
                      >
                        <Radio.Button value="Invoice">
                          {t("invoice")}
                        </Radio.Button>
                        <Radio.Button value="DeliveryNote">
                          {t("deliveryNote")}
                        </Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label={t("officialDocIdLabel")} required>
                      <Input
                        placeholder={t("officialDocIdPlaceholder")}
                        value={officialDocId}
                        onChange={(e) => {
                          setOfficialDocId(e.target.value);
                          saveFormData();
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label={t("deliveredByLabel")} required>
                      <Input
                        placeholder={t("deliveredByPlaceholder")}
                        value={deliveredBy}
                        onChange={(e) => {
                          setDeliveredBy(e.target.value);
                          saveFormData();
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label={t("documentDateLabel")} required>
                      <DatePicker
                        style={{ width: "100%" }}
                        value={documentDate}
                        onChange={(date) => {
                          setDocumentDate(date);
                          saveFormData();
                        }}
                        disabledDate={(current) =>
                          current && current > dayjs().endOf("day")
                        }
                        format="YYYY-MM-DD"
                        placeholder={t("selectDate")}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label={t("receivedDateLabel")}>
                      <Input
                        value={receivedDate.toISOString().slice(0, 10)}
                        disabled
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label={t("fileUploadLabel")}>
                  <Dragger {...uploadProps}>
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                      {t("uploadText") ||
                        "Click or drag file to this area to upload"}
                    </p>
                    <p className="ant-upload-hint">
                      {t("uploadHint") ||
                        "Support for single or bulk upload. Images and PDFs accepted."}
                    </p>
                  </Dragger>
                </Form.Item>
              </Form>
              <div style={{ marginTop: 24, textAlign: "right" }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={goNextStep}
                  icon={<ArrowLeftOutlined />}
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          )}
          {currentStep === 1 && (
            <div>
              <Title level={4}>{t("step2Title")}</Title>
              <Card id="add-item-form" title={t("addItemTitle") || "Add Line Item"} style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                  <Col xs={24} md={6}>
                    <Form.Item label={t("itemLabel")} required>
                      <Select
                        showSearch
                        placeholder={t("itemPlaceholder")}
                        options={itemOptions}
                        value={selectedItemId || undefined}
                        onChange={handleItemSelect}
                        filterOption={(input, option) =>
                          (option?.label ?? "")
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label={t("quantityLabel")} required>
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        placeholder={t("quantityPlaceholder")}
                        value={newQuantity}
                        onChange={(value) => setNewQuantity(value || 0)}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label={t("unitLabel")}>
                      <Input value={newUnit} disabled />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label={t("costLabel")}>
                      {useOneTimeSupplier ? (
                        // For one-time supplier: only show non-supplier price option
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Checkbox
                            checked={useNonSupplierPrice}
                            onChange={(e) =>
                              setUseNonSupplierPrice(e.target.checked)
                            }
                            style={{ marginBottom: 8 }}
                          >
                            {t("useNonSupplierPrice") || "Use custom price"}
                          </Checkbox>
                          {useNonSupplierPrice ? (
                            // Show custom price fields
                            <>
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {t("costExVatLabel")}
                                </Text>
                                <InputNumber
                                  style={{ width: "100%" }}
                                  min={0}
                                  value={nonSupplierPriceExVat}
                                  onChange={(value) => {
                                    const typed = value || 0;
                                    setNonSupplierPriceExVat(typed);
                                    setNonSupplierPriceIncVat(
                                      Number(
                                        (typed * (1 + VAT_RATE)).toFixed(2),
                                      ),
                                    );
                                  }}
                                  prefix="₪"
                                  placeholder="Enter custom price"
                                />
                              </div>
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {t("costIncVatLabel")}
                                </Text>
                                <InputNumber
                                  style={{ width: "100%" }}
                                  min={0}
                                  value={nonSupplierPriceIncVat}
                                  onChange={(value) => {
                                    const typed = value || 0;
                                    setNonSupplierPriceIncVat(typed);
                                    setNonSupplierPriceExVat(
                                      Number(
                                        (typed / (1 + VAT_RATE)).toFixed(2),
                                      ),
                                    );
                                  }}
                                  prefix="₪"
                                />
                              </div>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {t("costExVatLabel")}: ₪
                                {newCostExVat.toFixed(2)}
                              </Text>
                            </>
                          ) : (
                            // Show current price (read-only)
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Current Price:
                              </Text>
                              <div
                                style={{ padding: "8px 0", fontSize: "14px" }}
                              >
                                ₪{newCostExVat.toFixed(2)} (ex) / ₪
                                {newCostIncVat.toFixed(2)} (inc)
                              </div>
                            </div>
                          )}
                        </Space>
                      ) : (
                        // For regular supplier: show edit price option
                        <>
                          <Checkbox
                            checked={isCostEditable}
                            onChange={(e) =>
                              setIsCostEditable(e.target.checked)
                            }
                            style={{ marginBottom: 8 }}
                          >
                            {t("editPrice")}
                          </Checkbox>
                          <Space direction="vertical" style={{ width: "100%" }}>
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {t("costExVatLabel")}
                              </Text>
                              <InputNumber
                                style={{ width: "100%" }}
                                min={0}
                                value={newCostExVat}
                                disabled={!isCostEditable}
                                onChange={(value) => {
                                  const typed = value || 0;
                                  setNewCostExVat(typed);
                                  setNewCostIncVat(
                                    Number((typed * (1 + VAT_RATE)).toFixed(2)),
                                  );
                                  setLastEditedCostField("ex");
                                }}
                                prefix="₪"
                              />
                            </div>
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {t("costIncVatLabel")}
                              </Text>
                              <InputNumber
                                style={{ width: "100%" }}
                                min={0}
                                value={newCostIncVat}
                                disabled={!isCostEditable}
                                onChange={(value) => {
                                  const typed = value || 0;
                                  setNewCostIncVat(typed);
                                  setNewCostExVat(
                                    Number((typed / (1 + VAT_RATE)).toFixed(2)),
                                  );
                                  setLastEditedCostField("inc");
                                }}
                                prefix="₪"
                              />
                            </div>
                          </Space>
                        </>
                      )}
                    </Form.Item>
                  </Col>
                </Row>
                <Space>
                  <Button
                    type="primary"
                    icon={editingIndex !== null ? <SaveOutlined /> : <PlusOutlined />}
                    onClick={handleAddItem}
                  >
                    {editingIndex !== null ? (t("save") || "Save") : t("addItem")}
                  </Button>
                  {editingIndex !== null && (
                    <Button onClick={handleCancelEdit}>{t("cancel") || "Cancel"}</Button>
                  )}
                  <Button icon={<PlusOutlined />} onClick={() => setShowNewItem(true)}>{t("addNewProduct")}</Button>
                </Space>
              </Card>
              {items.length > 0 && (
                <Card
                  title={t("lineItemsTitle") || "Line Items"}
                  style={{ marginBottom: 24 }}
                  extra={(() => {
                    const totEx = items.reduce((sum, i) => sum + i.cost * i.quantity, 0);
                    return (
                      <Space direction="vertical" size={0}>
                        <Text strong>{t("totalCostLabel")}: ₪{totEx.toFixed(2)}</Text>
                        <Text type="secondary">{t("totalCostIncVatLabel")}: ₪{(totEx * (1 + VAT_RATE)).toFixed(2)}</Text>
                      </Space>
                    );
                  })()}
                >
                  <Table
                    dataSource={items}
                    columns={lineItemColumns}
                    rowKey={(record) => record.inventoryItemId}
                    pagination={false}
                  />
                </Card>
              )}
              <Form.Item label={t("remarksLabel")}>
                <TextArea
                  rows={4}
                  placeholder={t("remarksPlaceholder")}
                  value={remarks}
                  onChange={(e) => {
                    setRemarks(e.target.value);
                    saveFormData();
                  }}
                />
              </Form.Item>
              <Card
                title={t("documentSummaryTitle") || "Document Summary"}
                style={{ marginBottom: 24, background: "#fafafa" }}
              >
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text strong>{t("supplierIdLabel")}:</Text>{" "}
                    <Text>
                      {useOneTimeSupplier
                        ? oneTimeSupplierName
                        : suppliers.find((s) => s._id === supplierId)?.name || supplierId}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>{t("documentTypeLabel")}:</Text>{" "}
                    <Text>{documentType === "Invoice" ? t("invoice") : t("deliveryNote")}</Text>
                  </Col>
                  <Col span={12}><Text strong>{t("officialDocIdLabel")}:</Text> <Text>{officialDocId}</Text></Col>
                  <Col span={12}><Text strong>{t("deliveredByLabel")}:</Text> <Text>{deliveredBy}</Text></Col>
                  <Col span={12}><Text strong>{t("documentDateLabel")}:</Text> <Text>{documentDate ? documentDate.format("YYYY-MM-DD") : "-"}</Text></Col>
                  <Col span={12}><Text strong>{t("receivedDateLabel")}:</Text> <Text>{receivedDate.toISOString().slice(0, 10)}</Text></Col>
                  <Col span={24}><Text strong>{t("fileAttachedLabel")}:</Text> <Text>{fileList.length > 0 ? fileList.map((f) => f.name).join(", ") : t("noFile")}</Text></Col>
                </Row>
              </Card>
              <Row justify="space-between">
                <Col>
                  <Button onClick={goPrevStep} icon={<ArrowLeftOutlined />}>
                    {t("back")}
                  </Button>
                </Col>
                <Col>
                  <Button
                    type="primary"
                    size="large"
                    icon={<SaveOutlined />}
                    onClick={handleFinalSubmit}
                    disabled={items.length === 0}
                  >
                    {t("submitAndFinalize")}
                  </Button>
                </Col>
              </Row>
            </div>
          )}
        </Space>
      </Card>
      {showNewItem && (
        <InventoryAddForm
          onCancel={() => setShowNewItem(false)}
          onSuccess={(newItem) => {
            setAllItems((items) => [...items, newItem]);
            setShowNewItem(false);
            messageApi.success(
              t("newItemAdded") || "New item added successfully",
            );
          }}
        />
      )}
      <Modal
        title={t("successTitle") || "Success!"}
        open={successModalVisible}
        onOk={() => {
          setSuccessModalVisible(false);
          router.push("/mainMenu");
        }}
        onCancel={() => {
          setSuccessModalVisible(false);
          router.push("/mainMenu");
        }}
        okText={t("goToMainMenu") || "Go to Main Menu"}
        cancelText={t("close") || "Close"}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>{t("invoiceCreatedSuccess")}</Text>
          <Divider />
          <Text strong>{t("documentSummaryTitle")}:</Text>
          <Text>
            {t("officialDocIdLabel")}: {officialDocId}
          </Text>
          <Text>
            {t("totalItemsLabel") || "Total Items"}: {items.length}
          </Text>
          <Text>
            {t("totalCostLabel")}: ₪
            {items.reduce((sum, i) => sum + i.cost * i.quantity, 0).toFixed(2)}
          </Text>
        </Space>
      </Modal>
      {showBOMModal && (
        <BOMPreviewModal
          onClose={() => setShowBOMModal(false)}
          formData={bomFormData}
          inventoryItems={allItems}
        />
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      <RestoreFormModal
        open={showRestoreModal}
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
        translationKey="inventory.receive"
      />
    </div>
  );
}

// ------------------ BOM PREVIEW MODAL (Keep as is) ------------------
function BOMPreviewModal({
  onClose,
  formData,
  inventoryItems,
}: {
  onClose: () => void;
  formData: BOMFormData;
  inventoryItems: InventoryItem[];
}) {
  const t = useTranslations("inventory.receive");
  const { itemName, standardBatchWeight, components } = formData;

  return (
    <Modal
      title={`${t("bomFor")} ${itemName || t("nA")}`}
      open={true}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          {t("close") || "Close"}
        </Button>,
      ]}
      width={600}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Text strong>{t("productWeightLabel")}: </Text>
          <Text>{standardBatchWeight} g</Text>
        </div>
        {components.length === 0 ? (
          <Text type="secondary">{t("noComponents")}</Text>
        ) : (
          <div>
            {components.map((comp, idx) => {
              const rm = inventoryItems.find(
                (inv) => inv._id === comp.componentId,
              );
              const rmName = rm?.itemName || t("unknownComponent");
              const rmCost = rm?.currentCostPrice ?? 0;
              const fraction = standardBatchWeight
                ? comp.grams / standardBatchWeight
                : 0;
              const percentage = fraction * 100;
              const costPerGram = rmCost / 1000;
              const partialCost = costPerGram * comp.grams;
              return (
                <Card key={idx} size="small" style={{ marginBottom: 12 }}>
                  <Space direction="vertical" size="small">
                    <Text strong>{rmName}</Text>
                    <Text type="secondary">
                      {t("weightUsed")}: {comp.grams} g
                    </Text>
                    <Text type="secondary">
                      {t("percentage")}: {percentage.toFixed(2)}%
                    </Text>
                    <Text type="secondary">
                      {t("partialCost")}: ₪{partialCost.toFixed(2)}
                    </Text>
                  </Space>
                </Card>
              );
            })}
          </div>
        )}
      </Space>
    </Modal>
  );
}

// ------------------------------------------------------------------
// 4. THIS IS YOUR NEW DEFAULT EXPORT
//    It simply wraps your actual content in Suspense
// ------------------------------------------------------------------
export default function ReceiveInventoryPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "50px",
          }}
        >
          <Spin size="large" tip="Loading..." />
        </div>
      }
    >
      <ReceiveInventoryContent />
    </Suspense>
  );
}
