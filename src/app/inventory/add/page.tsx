"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  startTransition,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
// import Quagga from "quagga"; // Removed for dynamic import
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
  Checkbox,
  Modal,
  Divider,
  Table,
  Space,
  message,
} from "antd";
import {
  SaveOutlined,
  ScanOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  unit?: string;
  currentCostPrice?: number;
}

interface ComponentLine {
  componentId: string;
  grams: number;
}

export default function AddInventoryItem() {
  const router = useRouter();
  const t = useTranslations("inventory.add");
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // State management
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false for immediate interaction
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [components, setComponents] = useState<ComponentLine[]>([]);
  const [autoAssignSKU, setAutoAssignSKU] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const quaggaRef = useRef<any>(null); // Ref to hold Quagga instance

  // Form persistence hook
  const {
    showRestoreModal,
    handleRestoreConfirm: handleRestore,
    handleRestoreCancel,
    saveFormData,
    clearSavedData,
  } = useFormPersistence({
    formKey: "inventory-add",
    form,
    additionalData: { components, selectedCategory, autoAssignSKU },
    onRestore: (data) => {
      if (data.components) setComponents(data.components);
      if (data.selectedCategory) setSelectedCategory(data.selectedCategory);
      if (data.autoAssignSKU !== undefined)
        setAutoAssignSKU(data.autoAssignSKU);
    },
  });

  // Load inventory only when user opens BOM component selector
  const loadRawMaterials = useCallback(() => {
    if (inventoryItems.length === 0 && !isLoading) {
      setIsLoading(true);
      fetch(
        "/api/inventory?category=ProductionRawMaterial,CoffeeshopRawMaterial,Packaging,SemiFinalProduct&fields=_id,itemName,category,currentCostPrice",
      )
        .then((res) => res.json())
        .then((data) => {
          setInventoryItems(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(t("errorLoadingInventory"), err);
          setIsLoading(false);
        });
    }
  }, [inventoryItems.length, isLoading, t]);

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
    {
      value: "WorkShopRawMaterial",
      label: t("categoryOptions.WorkShopRawMaterial"),
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

  // BOM raw materials: include all categories except Final products
  const rawMaterials = inventoryItems
    .filter((i) => i.category !== "FinalProduct")
    .map((i) => ({ value: i._id, label: i.itemName }));

  // Handle category change
  const handleCategoryChange = useCallback(
    (value: string) => {
      setSelectedCategory(value);
      setComponents([]);
      form.setFieldValue("standardBatchWeight", undefined);
    },
    [form],
  );

  // Add a new BOM line
  const handleComponentAdd = useCallback(
    (componentId: string) => {
      if (components.some((c) => c.componentId === componentId)) {
        messageApi.warning(t("errorComponentDuplicate"));
        return;
      }
      const isPackaging =
        inventoryItems.find((i) => i._id === componentId)?.category ===
        "Packaging";
      setComponents([
        ...components,
        { componentId, grams: isPackaging ? 1 : 0 },
      ]);
    },
    [components, inventoryItems, t, messageApi],
  );

  const handleGramsChange = (index: number, grams: number) => {
    const updated = [...components];
    updated[index].grams = grams || 0;
    setComponents(updated);
  };

  const handleRemoveLine = (index: number) => {
    const updated = [...components];
    updated.splice(index, 1);
    setComponents(updated);
  };

  // Sum only raw-material grams
  const totalBOMGrams = components.reduce((sum, c) => {
    const item = inventoryItems.find((i) => i._id === c.componentId);
    return item?.category === "Packaging" ? sum : sum + c.grams;
  }, 0);

  // Barcode scanner
  // Scanner mechanism (Using ZXing for better React 18 compatibility)
  const scannerRef = useRef<any>(null); // Ref to hold the ZXing reader
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleScanBarcode = useCallback(async () => {
    setIsScannerOpen(true);
  }, []);

  useEffect(() => {
    let selectedDeviceId: string;
    let codeReader: any;

    if (isScannerOpen) {
      import("@zxing/library").then((ZXing) => {
        codeReader = new ZXing.BrowserMultiFormatReader();
        scannerRef.current = codeReader;

        // Try getting cameras, with fallback error handling for OS-level blocking
        navigator.mediaDevices.getUserMedia({ video: true })
          .then((stream) => {
            // Instantly stop this stream, we just used it to trigger the OS permission prompt
            stream.getTracks().forEach(track => track.stop());
            
            codeReader
              .listVideoInputDevices()
              .then((videoInputDevices: any[]) => {
                if (videoInputDevices.length > 0) {
                  // Prefer back camera if available
                  const backCamera = videoInputDevices.find((device) =>
                    device.label.toLowerCase().includes("back"),
                  );
                  selectedDeviceId = backCamera
                    ? backCamera.deviceId
                    : videoInputDevices[0].deviceId;

                  codeReader.decodeFromVideoDevice(
                    selectedDeviceId,
                    "video-preview",
                    (result: any, err: any) => {
                      if (result && result.text) {
                        console.log("Barcode scanned:", result.text); // debug log
                        // Stop scanning immediately to prevent duplicate reads
                        codeReader.reset();
                        
                        // Set value immediately using the form instance and trigger re-render
                        form.setFieldsValue({ barcode: result.text });
                        // Also set it with setFieldValue just in case
                        form.setFieldValue("barcode", result.text);
                        
                        // Programmatic setFieldsValue doesn't trigger onValuesChange, so persist manually
                        saveFormData();
                        
                        setIsScannerOpen(false);
                      }
                      if (err && !(err instanceof ZXing.NotFoundException)) {
                        // Ignore NotFoundException, it just means no barcode in current frame
                      }
                    },
                  ).catch((err: any) => {
                    console.error("Video stream error:", err);
                    messageApi.error(t("cameraPermissionDenied") + " (Stream Error)");
                    setIsScannerOpen(false);
                  });
                } else {
                  messageApi.error(t("cameraInitError"));
                  setIsScannerOpen(false);
                }
              })
              .catch((err: any) => {
                console.error("Device list error:", err);
                messageApi.error(t("cameraPermissionDenied") + " (Device List Error)");
                setIsScannerOpen(false);
              });
          })
          .catch((err) => {
             console.error("Manual permission request error:", err);
             messageApi.error(t("cameraPermissionDenied"));
             setIsScannerOpen(false);
          });
      });
    }

    return () => {
      if (codeReader) {
        codeReader.reset();
      }
    };
  }, [isScannerOpen, form, messageApi, t]);

  // Preview BOM
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

  // Submit form
  const handleSubmit = async (values: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const catVal = values.category;
    if (["SemiFinalProduct", "FinalProduct"].includes(catVal)) {
      if (!values.standardBatchWeight || values.standardBatchWeight <= 0) {
        messageApi.error(t("errorBatchWeightRequired"));
        setIsSubmitting(false);
        return;
      }
      if (totalBOMGrams !== values.standardBatchWeight) {
        messageApi.error(
          t("errorBOMMismatch", {
            total: totalBOMGrams,
            batch: values.standardBatchWeight,
          }),
        );
        setIsSubmitting(false);
        return;
      }
    }

    let finalSKU = values.sku;
    if (autoAssignSKU) finalSKU = "AUTO-SKU-PLACEHOLDER";

    const convertedComponents = components.map((c) => {
      let pct = 0;
      const batchWeight = values.standardBatchWeight || 0;
      if (["SemiFinalProduct", "FinalProduct"].includes(catVal)) {
        pct = (c.grams / batchWeight) * 100;
      }
      return {
        componentId: c.componentId,
        percentage: pct,
        quantityUsed: c.grams,
      };
    });

    const dataToSend = {
      sku: finalSKU,
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

    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSend),
    });
    const result = await response.json();
    if (response.ok) {
      // Clear localStorage on successful submission
      clearSavedData();
      setSuccessMessage(t(result.messageKey || "itemAddedSuccess"));
      setShowSuccessModal(true);
      setIsSubmitting(false);
    } else {
      // Handle specific error cases
      if (result.error === "duplicateSKU") {
        messageApi.error(t("duplicateSKU"), 5);
      } else if (result.error === "itemAddedFailure") {
        messageApi.error(t("itemAddedFailure"));
      } else {
        messageApi.error(t(result.error || "itemAddedFailure"));
      }
      setIsSubmitting(false);
    }
  };

  // Show conditional pricing fields
  const showCostPrice = [
    "ProductionRawMaterial",
    "CoffeeshopRawMaterial",
    "CleaningMaterial",
    "Packaging",
    "DisposableEquipment",
  ].includes(selectedCategory);

  const showBusinessClientPrices = selectedCategory === "FinalProduct";
  const showBOMSection = ["SemiFinalProduct", "FinalProduct"].includes(
    selectedCategory,
  );

  // Component table columns
  const componentColumns = [
    {
      title: t("componentLabel"),
      dataIndex: "componentId",
      key: "componentId",
      render: (componentId: string) => {
        const item = inventoryItems.find((inv) => inv._id === componentId);
        return item?.itemName || t("unknownComponent");
      },
    },
    {
      title: t("gramsLabel"),
      key: "grams",
      width: 150,
      render: (_: any, record: ComponentLine, index: number) => (
        <InputNumber
          min={0}
          step={0.01}
          value={record.grams}
          onChange={(value) => handleGramsChange(index, value || 0)}
          placeholder={t("gramsPlaceholder")}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: t("actionLabel"),
      key: "action",
      width: 100,
      render: (_: any, record: ComponentLine, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveLine(index)}
        >
          {t("removeBOMProduct")}
        </Button>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
      }}
    >
      {contextHolder}
      <Card
        style={{ maxWidth: "1200px", margin: "0 auto" }}
        title={
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            {t("title")}
          </div>
        }
        extra={
          <BackButton onClick={() => router.back()}>{t("back")}</BackButton>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={saveFormData}
          initialValues={{
            quantity: 0,
            minQuantity: 0,
          }}
        >
          <Row gutter={16}>
            {/* SKU + Auto Assign */}
            <Col xs={24} md={12}>
                  <Form.Item label={t("skuLabel")}>
                <Space.Compact style={{ width: "100%" }}>
                  <Form.Item
                    name="sku"
                    noStyle
                    rules={[
                      {
                        required: !autoAssignSKU,
                        message: t("errorSKURequired"),
                      },
                    ]}
                  >
                    <Input
                      placeholder={t("skuPlaceholder")}
                      disabled={autoAssignSKU}
                      style={{ flex: 1 }}
                    />
                  </Form.Item>
                  <Checkbox
                    checked={autoAssignSKU}
                    onChange={(e) => setAutoAssignSKU(e.target.checked)}
                    style={{
                      padding: "0 11px",
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid #d9d9d9",
                      borderLeft: 0,
                    }}
                  >
                    {t("autoAssign")}
                  </Checkbox>
                </Space.Compact>
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
                    type="primary"
                    icon={<ScanOutlined />}
                    onClick={handleScanBarcode}
                    style={{ background: "#52c41a", borderColor: "#52c41a" }}
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
                  options={categories}
                  onChange={handleCategoryChange}
                  loading={isLoading}
                />
              </Form.Item>
            </Col>

            {/* Starting Quantity */}
            <Col xs={24} md={12}>
              <Form.Item label={t("quantityLabel")} name="quantity">
                <InputNumber
                  placeholder={t("quantityPlaceholder")}
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                />
              </Form.Item>
            </Col>

            {/* Unit */}
            <Col xs={24} md={12}>
              <Form.Item label={t("unitLabel")} name="unit">
                <Select
                  placeholder={t("unitPlaceholder")}
                  options={units}
                  loading={isLoading}
                />
              </Form.Item>
            </Col>

            {/* Min Quantity */}
            <Col xs={24} md={12}>
              <Form.Item label={t("minQuantityLabel")} name="minQuantity">
                <InputNumber
                  placeholder={t("minQuantityPlaceholder")}
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                />
              </Form.Item>
            </Col>

            {/* Cost Price for certain categories */}
            {showCostPrice && (
              <Col xs={24} md={12}>
                <Form.Item label={t("costPriceLabel")} name="currentCostPrice">
                  <InputNumber
                    placeholder={t("costPricePlaceholder")}
                    style={{ width: "100%" }}
                    min={0}
                    step={0.01}
                    prefix="₪"
                  />
                </Form.Item>
              </Col>
            )}

            {/* Business + Client Prices for Final Products */}
            {showBusinessClientPrices && (
              <>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={t("businessPriceLabel")}
                    name="currentBusinessPrice"
                  >
                    <InputNumber
                      placeholder={t("businessPricePlaceholder")}
                      style={{ width: "100%" }}
                      min={0}
                      step={0.01}
                      prefix="₪"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={t("clientPriceLabel")}
                    name="currentClientPrice"
                  >
                    <InputNumber
                      placeholder={t("clientPricePlaceholder")}
                      style={{ width: "100%" }}
                      min={0}
                      step={0.01}
                      prefix="₪"
                    />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>

          {/* BOM Section for Semi/Final Products */}
          {showBOMSection && (
            <>
              <Divider>{t("bomTitle")}</Divider>

              <Row gutter={16}>
                <Col xs={24}>
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
                      placeholder={t("standardBatchWeightPlaceholder")}
                      style={{ width: "100%" }}
                      min={0}
                      step={0.01}
                      addonAfter="g"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Card
                type="inner"
                title={t("bomTitle")}
                style={{ marginBottom: "16px" }}
              >
                <Space
                  direction="vertical"
                  style={{ width: "100%" }}
                  size="middle"
                >
                  <div>
                    <Select
                      showSearch
                      placeholder={t("bomSelectPlaceholder")}
                      options={rawMaterials}
                      onChange={handleComponentAdd}
                      onFocus={loadRawMaterials}
                      style={{ width: "100%", maxWidth: "400px" }}
                      filterOption={(input, option) => {
                        const searchWords = input.toLowerCase().split(/\s+/).filter(Boolean);
                        if (searchWords.length === 0) return true;
                        const label = (option?.label as string) ?? '';
                        return searchWords.every((word) => label.toLowerCase().includes(word));
                      }}
                      loading={isLoading}
                    />
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "12px",
                        color: "#8c8c8c",
                      }}
                    >
                      {t("bomAddMaterialNote")}
                    </div>
                  </div>

                  {components.length > 0 && (
                    <>
                      <Table
                        dataSource={components}
                        columns={componentColumns}
                        pagination={false}
                        rowKey="componentId"
                        size="small"
                      />

                      <div style={{ fontSize: "14px", fontWeight: "500" }}>
                        {t("totalBOMGramsLabel", {
                          bomtotal: totalBOMGrams.toString(),
                        })}
                      </div>

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
            </>
          )}

          {/* Submit Button */}
          <Form.Item style={{ marginTop: "24px" }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isSubmitting}
              size="large"
              block
            >
              {isSubmitting ? t("Processing") : t("submit")}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* SCANNER MODAL */}
      <Modal
        title={t("scanBarcodeTitle")}
        open={isScannerOpen}
        onCancel={() => setIsScannerOpen(false)}
        footer={null}
        width={600}
      >
        <div style={{ width: "100%", textAlign: "center", minHeight: "320px", display: "flex", justifyContent: "center", backgroundColor: "#000", borderRadius: "8px", overflow: "hidden" }}>
          <video
            id="video-preview"
            ref={videoRef}
            style={{ width: "100%", height: "320px", objectFit: "cover" }}
          ></video>
        </div>
        <p style={{ textAlign: "center", marginTop: "16px", color: "#8c8c8c" }}>
          {t("scanInstructions")}
        </p>
      </Modal>

      {/* RESTORE CONFIRMATION MODAL */}
      <RestoreFormModal
        open={showRestoreModal}
        onConfirm={handleRestore}
        onCancel={handleRestoreCancel}
        translationKey="inventory.add"
      />

      {/* BOM PREVIEW MODAL */}
      {showBOMModal && (
        <BOMPreviewModal
          open={showBOMModal}
          onClose={() => setShowBOMModal(false)}
          itemName={form.getFieldValue("itemName")}
          standardBatchWeight={form.getFieldValue("standardBatchWeight")}
          components={components}
          inventoryItems={inventoryItems}
        />
      )}

      {/* SUCCESS MODAL */}
      <Modal
        title={t("itemAddedSuccess")}
        open={showSuccessModal}
        onCancel={() => setShowSuccessModal(false)}
        footer={[
          <Button
            key="ok"
            type="primary"
            onClick={() => {
              setShowSuccessModal(false);
              router.push("/mainMenu");
            }}
          >
            {t("okMessage")}
          </Button>,
        ]}
      >
        <p>{successMessage}</p>
      </Modal>
    </div>
  );
}

// BOM PREVIEW MODAL – shows packaging cost and totals
function BOMPreviewModal({
  open,
  onClose,
  itemName,
  standardBatchWeight,
  components,
  inventoryItems,
}: {
  open: boolean;
  onClose: () => void;
  itemName: string;
  standardBatchWeight: number;
  components: ComponentLine[];
  inventoryItems: InventoryItem[];
}) {
  const t = useTranslations("inventory.add");
  const batchWeightNum = Number(standardBatchWeight) || 0;

  // Compute total cost including packaging
  const totalCost = components.reduce((acc, comp) => {
    const rm = inventoryItems.find((inv) => inv._id === comp.componentId);
    if (!rm) return acc;
    if (rm.category === "Packaging") {
      return acc + (rm.currentCostPrice || 0) * comp.grams;
    }
    return acc + ((rm.currentCostPrice || 0) / 1000) * comp.grams;
  }, 0);

  const columns = [
    {
      title: t("componentLabel"),
      dataIndex: "componentId",
      key: "componentId",
      render: (componentId: string) => {
        const rm = inventoryItems.find((inv) => inv._id === componentId);
        return <strong>{rm?.itemName || t("unknownComponent")}</strong>;
      },
    },
    {
      title: t("weightUsed"),
      key: "weightUsed",
      align: "center" as const,
      render: (_: any, record: ComponentLine) => {
        const rm = inventoryItems.find((inv) => inv._id === record.componentId);
        return rm?.category === "Packaging"
          ? `${record.grams} pc`
          : `${record.grams} g`;
      },
    },
    {
      title: t("percentage"),
      key: "percentage",
      align: "center" as const,
      render: (_: any, record: ComponentLine) => {
        const rm = inventoryItems.find((inv) => inv._id === record.componentId);
        if (rm?.category === "Packaging") return "—";
        const fraction = batchWeightNum ? record.grams / batchWeightNum : 0;
        return (fraction * 100).toFixed(2) + "%";
      },
    },
    {
      title: t("partialCost"),
      key: "partialCost",
      align: "center" as const,
      render: (_: any, record: ComponentLine) => {
        const rm = inventoryItems.find((inv) => inv._id === record.componentId);
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
      title={
        <span>
          {t("bomFor")} <strong>{itemName || t("nA")}</strong>
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          {t("okMessage")}
        </Button>,
      ]}
      width={800}
    >
      <div style={{ marginBottom: "16px" }}>
        <span style={{ fontWeight: "600" }}>{t("productWeightLabel")}: </span>
        {batchWeightNum} g
      </div>
      <Table
        dataSource={components}
        columns={columns}
        pagination={false}
        rowKey="componentId"
        size="small"
        scroll={{ y: 300 }}
      />
      <div
        style={{
          marginTop: "16px",
          textAlign: "right",
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        {t("bomTotalCost")} ₪{totalCost.toFixed(2)}
      </div>
    </Modal>
  );
}
