"use client";

import React, { useState, useEffect } from "react";
import InventoryAddForm from "@/components/InventoryAddForm";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
} from "antd";
import {
  UploadOutlined,
  SaveOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import dayjs, { Dayjs } from "dayjs";

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Dragger } = Upload;

//
// Types
//
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
}

// BOM form data type (for preview)
interface BOMFormData {
  itemName: string;
  standardBatchWeight: number;
  components: { componentId: string; grams: number }[];
}

//
// Receive Inventory Page Component
//
export default function ReceiveInventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("inventory.receive");
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // ------------------ Step Management ------------------
  const [currentStep, setCurrentStep] = useState<number>(0);

  // ------------------ Supplier & Items Lists ------------------
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);

  // ------------------ Step 1: Document Info ------------------
  const [supplierId, setSupplierId] = useState("");
  const [officialDocId, setOfficialDocId] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [documentDate, setDocumentDate] = useState<Dayjs | null>(null);
  const [receivedDate] = useState<Date>(new Date());
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [documentType, setDocumentType] = useState<"Invoice" | "DeliveryNote">(
    "Invoice"
  );

  // ------------------ Step 2: Items & Remarks ------------------
  const [items, setItems] = useState<LineItem[]>([]);
  const [remarks, setRemarks] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [newUnit, setNewUnit] = useState<string>("");

  const VAT_RATE = 0.18;

  const [newCostExVat, setNewCostExVat] = useState<number>(0);
  const [newCostIncVat, setNewCostIncVat] = useState<number>(0);
  const [isCostEditable, setIsCostEditable] = useState<boolean>(false);
  const [lastEditedCostField, setLastEditedCostField] = useState<"ex" | "inc">(
    "ex"
  );

  const [showNewItem, setShowNewItem] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // ------------------ BOM Preview Data ------------------
  const [bomFormData, setBomFormData] = useState<BOMFormData>({
    itemName: "",
    standardBatchWeight: 0,
    components: [],
  });
  const [showBOMModal, setShowBOMModal] = useState(false);

  //
  // Fetch suppliers & items on mount + handle URL param
  //
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

  //
  // Build options for Ant Design Select
  //
  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: s.name,
  }));

  const itemOptions = allItems.map((it) => ({
    value: it._id,
    label: it.itemName,
  }));

  //
  // Step Handlers
  //
  function goNextStep() {
    if (!supplierId || !officialDocId || !deliveredBy) {
      messageApi.error(t("errorFillStep1"));
      return;
    }
    setCurrentStep(1);
  }

  function goPrevStep() {
    setCurrentStep(0);
  }

  //
  // File Upload Handler
  //
  const uploadProps: UploadProps = {
    fileList,
    beforeUpload: (file) => {
      setFileList((prev) => [...prev, file as UploadFile]);
      return false; // Prevent auto upload
    },
    onRemove: (file) => {
      setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
    },
    multiple: true,
  };

  //
  // Add Item to Table
  //
  function handleAddItem() {
    if (!selectedItemId || newQuantity <= 0 || !newUnit || newCostExVat < 0) {
      messageApi.error(t("errorFillItem"));
      return;
    }

    const matchedItem = allItems.find((it) => it._id === selectedItemId);
    if (!matchedItem) {
      messageApi.error(t("errorItemNotFound"));
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        inventoryItemId: matchedItem._id,
        sku: matchedItem.sku,
        itemName: matchedItem.itemName,
        quantity: newQuantity,
        unit: newUnit,
        cost: newCostExVat, // EX VAT
      },
    ]);

    // Reset fields
    setSelectedItemId("");
    setNewQuantity(0);
    setNewUnit("");
    setNewCostExVat(0);
    setNewCostIncVat(0);
    setIsCostEditable(false);
    setLastEditedCostField("ex");
    
    messageApi.success(t("itemAddedSuccess") || "Item added successfully");
  }

  function handleRemoveLine(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    messageApi.success(t("itemRemovedSuccess") || "Item removed");
  }

  //
  // Handle Item Selection
  //
  const handleItemSelect = (value: string) => {
    setSelectedItemId(value);
    const matchedItem = allItems.find((it) => it._id === value);

    if (matchedItem) {
      setNewUnit(matchedItem.unit || "");
      const base = matchedItem.currentCostPrice ?? 0; // EX VAT
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

  //
  // Final Submit
  //
  async function handleFinalSubmit() {
    if (items.length === 0) {
      messageApi.error(t("errorNoLineItems"));
      return;
    }

    const formDataObj = new FormData();
    formDataObj.append("supplierId", supplierId);
    formDataObj.append("officialDocId", officialDocId);
    formDataObj.append("deliveredBy", deliveredBy);
    formDataObj.append("documentDate", documentDate ? documentDate.format("YYYY-MM-DD") : "");
    formDataObj.append("receivedDate", receivedDate.toISOString());
    formDataObj.append("remarks", remarks);
    formDataObj.append("documentType", documentType);

    // Append files
    if (fileList.length > 0) {
      fileList.forEach((file) => {
        if (file.originFileObj) {
          formDataObj.append("file", file.originFileObj);
        }
      });
    }

    formDataObj.append("items", JSON.stringify(items));

    try {
      messageApi.loading({ content: t("submitting") || "Submitting...", key: "submit" });
      
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
      setSuccessModalVisible(true);
    } catch (err: any) {
      console.error("Error finalizing invoice:", err);
      messageApi.destroy("submit");
      messageApi.error(t("errorFinalizingInvoice") + ": " + err.message);
    }
  }

  //
  // Table columns for line items
  //
  const lineItemColumns = [
    {
      title: t("sku"),
      dataIndex: "sku",
      key: "sku",
      render: (text: string) => text || "-",
    },
    {
      title: t("itemName"),
      dataIndex: "itemName",
      key: "itemName",
    },
    {
      title: t("quantity"),
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: t("unit"),
      dataIndex: "unit",
      key: "unit",
    },
    {
      title: t("cost"),
      key: "cost",
      render: (_: any, record: LineItem) => (
        <div>
          <div>₪{record.cost.toFixed(2)} (ex)</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ₪{(record.cost * (1 + VAT_RATE)).toFixed(2)} (inc)
          </Text>
        </div>
      ),
    },
    {
      title: t("remove"),
      key: "action",
      render: (_: any, record: LineItem, index: number) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveLine(index)}
        >
          {t("remove")}
        </Button>
      ),
    },
  ];

  //
  // Steps configuration
  //
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

  //
  // Render
  //
  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: "24px" }}>
      {contextHolder}
      
      <Card style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div>
            <Button onClick={() => router.back()} style={{ marginBottom: 16 }}>
              <ArrowRightOutlined /> {t("back")}
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              {t("receiveInventoryTitle") || "Receive Inventory"}
            </Title>
          </div>

          {/* Steps indicator */}
          <Steps current={currentStep} items={steps} />

          <Divider />

          {/* Step 1: Document Info */}
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
                      <Select
                        showSearch
                        placeholder={t("supplierPlaceholder")}
                        options={supplierOptions}
                        value={supplierId || undefined}
                        onChange={(value) => setSupplierId(value)}
                        filterOption={(input, option) =>
                          (option?.label ?? "")
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item label={t("documentTypeLabel")} required>
                      <Radio.Group
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
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
                        onChange={(e) => setOfficialDocId(e.target.value)}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item label={t("deliveredByLabel")} required>
                      <Input
                        placeholder={t("deliveredByPlaceholder")}
                        value={deliveredBy}
                        onChange={(e) => setDeliveredBy(e.target.value)}
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
                        onChange={(date) => setDocumentDate(date)}
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
                      {t("uploadText") || "Click or drag file to this area to upload"}
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

          {/* Step 2: Items & Remarks */}
          {currentStep === 1 && (
            <div>
              <Title level={4}>{t("step2Title")}</Title>

              {/* Add Item Section */}
              <Card
                title={t("addItemTitle") || "Add Line Item"}
                style={{ marginBottom: 24 }}
              >
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
                      <Checkbox
                        checked={isCostEditable}
                        onChange={(e) => setIsCostEditable(e.target.checked)}
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
                                Number((typed * (1 + VAT_RATE)).toFixed(2))
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
                                Number((typed / (1 + VAT_RATE)).toFixed(2))
                              );
                              setLastEditedCostField("inc");
                            }}
                            prefix="₪"
                          />
                        </div>
                      </Space>
                    </Form.Item>
                  </Col>
                </Row>

                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddItem}
                  >
                    {t("addItem")}
                  </Button>
                  
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => setShowNewItem(true)}
                  >
                    {t("addNewProduct")}
                  </Button>
                </Space>
              </Card>

              {/* Line Items Table */}
              {items.length > 0 && (
                <Card
                  title={t("lineItemsTitle") || "Line Items"}
                  style={{ marginBottom: 24 }}
                  extra={
                    <Text strong>
                      {t("totalCostLabel")}: ₪
                      {items
                        .reduce((sum, i) => sum + i.cost * i.quantity, 0)
                        .toFixed(2)}
                    </Text>
                  }
                >
                  <Table
                    dataSource={items}
                    columns={lineItemColumns}
                    rowKey={(record, index) => `${record.inventoryItemId}-${index}`}
                    pagination={false}
                  />
                </Card>
              )}

              {/* Remarks */}
              <Form.Item label={t("remarksLabel")}>
                <TextArea
                  rows={4}
                  placeholder={t("remarksPlaceholder")}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </Form.Item>

              {/* Document Summary */}
              <Card
                title={t("documentSummaryTitle") || "Document Summary"}
                style={{ marginBottom: 24, background: "#fafafa" }}
              >
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text strong>{t("supplierIdLabel")}:</Text>{" "}
                    <Text>{suppliers.find(s => s._id === supplierId)?.name || supplierId}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>{t("documentTypeLabel")}:</Text>{" "}
                    <Text>{documentType === "Invoice" ? t("invoice") : t("deliveryNote")}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>{t("officialDocIdLabel")}:</Text>{" "}
                    <Text>{officialDocId}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>{t("deliveredByLabel")}:</Text>{" "}
                    <Text>{deliveredBy}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>{t("documentDateLabel")}:</Text>{" "}
                    <Text>{documentDate ? documentDate.format("YYYY-MM-DD") : "-"}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>{t("receivedDateLabel")}:</Text>{" "}
                    <Text>{receivedDate.toISOString().slice(0, 10)}</Text>
                  </Col>
                  <Col span={24}>
                    <Text strong>{t("fileAttachedLabel")}:</Text>{" "}
                    <Text>
                      {fileList.length > 0
                        ? fileList.map((f) => f.name).join(", ")
                        : t("noFile")}
                    </Text>
                  </Col>
                </Row>
              </Card>

              {/* Action Buttons */}
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

      {/* New Item Modal */}
      {showNewItem && (
        <InventoryAddForm
          onCancel={() => setShowNewItem(false)}
          onSuccess={(newItem) => {
            setAllItems((items) => [...items, newItem]);
            setShowNewItem(false);
            messageApi.success(t("newItemAdded") || "New item added successfully");
          }}
        />
      )}

      {/* Success Modal */}
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

      {/* BOM Preview Modal */}
      {showBOMModal && (
        <BOMPreviewModal
          onClose={() => setShowBOMModal(false)}
          formData={bomFormData}
          inventoryItems={allItems}
        />
      )}
    </div>
  );
}

// ------------------ BOM PREVIEW MODAL ------------------
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
              const rm = inventoryItems.find((inv) => inv._id === comp.componentId);
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
