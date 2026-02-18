"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { RestoreFormModal } from "@/components/RestoreFormModal";
import {
  Form,
  Select,
  InputNumber,
  DatePicker,
  Button,
  Card,
  Alert,
  Typography,
  Space,
  message,
  Modal,
  List,
  Divider,
} from "antd";
import {
  ArrowRightOutlined,
  SaveOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
}

interface ProductionTask {
  _id: string;
  taskType: string;
  taskName: string;
  product?: {
    _id: string;
    itemName: string;
  };
  plannedQuantity?: number;
  productionDate: string;
  status: "Pending" | "InProgress" | "Completed" | "Cancelled";
  createdAt: string;
}

export default function ProductionTasksPage() {
  const router = useRouter();
  const t = useTranslations("production.create");
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  // Form persistence hook
  const {
    showRestoreModal,
    handleRestoreConfirm: handleRestoreConfirmBase,
    handleRestoreCancel,
    saveFormData,
    clearSavedData,
  } = useFormPersistence({
    formKey: 'production-tasks-create',
    form,
    onRestore: (data) => {
      // Convert date string back to dayjs object
      const formValues = form.getFieldsValue();
      if (formValues.productionDate && typeof formValues.productionDate === 'string') {
        form.setFieldValue('productionDate', dayjs(formValues.productionDate));
      }
    },
  });

  // Wrapper to handle date conversion on restore
  const handleRestoreConfirm = () => {
    handleRestoreConfirmBase();
    // Convert date string after restore
    setTimeout(() => {
      const formValues = form.getFieldsValue();
      if (formValues.productionDate && typeof formValues.productionDate === 'string') {
        form.setFieldValue('productionDate', dayjs(formValues.productionDate));
      }
    }, 300);
  };

  useEffect(() => {
    fetch("/api/inventory?category=FinalProduct,SemiFinalProduct&fields=_id,itemName,category")
      .then((res) => res.json())
      .then((data: InventoryItem[]) => {
        setInventoryItems(data);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (values: any, skipValidation = false) => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        taskType: "Production",
        productionDate: values.productionDate.format("YYYY-MM-DD"),
        product: values.product,
        plannedQuantity: values.plannedQuantity,
        status: "Pending",
        skipValidation,
      };

      const res = await fetch("/api/production/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      // Check if validation is required
      if (responseData.validationRequired && !skipValidation) {
        setValidationData(responseData);
        setPendingPayload(values);
        setValidationModalVisible(true);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(t("errorCreatingTask") || responseData.error);

      messageApi.success(t("createTaskSuccess"));
      clearSavedData();
      form.resetFields();

      setTimeout(() => {
        router.push("/welcomePage");
      }, 300);
    } catch (err: any) {
      setError(err.message);
      messageApi.error(err.message);
    }

    setLoading(false);
  };

  const handleValidationConfirm = async () => {
    if (pendingPayload) {
      setValidationModalVisible(false);
      await handleSubmit(pendingPayload, true);
    }
  };

  const handleValidationCancel = () => {
    setValidationModalVisible(false);
    setValidationData(null);
    setPendingPayload(null);
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Button
            icon={<ArrowRightOutlined />}
            onClick={() => router.push("/welcomePage")}
            size="large"
          >
            {t("back")}
          </Button>

          <Card
            style={{
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Title
              level={2}
              style={{ marginBottom: "24px", textAlign: "center" }}
            >
              <PlusOutlined /> {t("pageTitle")}
            </Title>

            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: "24px" }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onValuesChange={saveFormData}
              size="large"
            >
              <Form.Item
                name="product"
                label={t("productLabel")}
                rules={[{ required: true, message: t("errorSelectProduct") }]}
              >
                <Select
                  placeholder={t("productPlaceholder")}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label || "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={inventoryItems.map((item) => ({
                    label: item.itemName,
                    value: item._id,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="plannedQuantity"
                label={t("plannedQuantityLabel")}
                rules={[
                  { required: true, message: t("errorValidQuantity") },
                  {
                    type: "number",
                    min: 1,
                    message: t("errorValidQuantity"),
                  },
                ]}
              >
                <InputNumber
                  placeholder={t("plannedQuantityPlaceholder")}
                  style={{ width: "100%" }}
                  min={1}
                />
              </Form.Item>

              <Form.Item
                name="productionDate"
                label={t("plannedDateLabel")}
                rules={[
                  { required: true, message: t("errorSelectDate") },
                  {
                    validator: (_, value) => {
                      if (value && value.isBefore(dayjs().startOf("day"))) {
                        return Promise.reject(new Error(t("errorPastDate")));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="YYYY-MM-DD"
                  disabledDate={(current) => {
                    return current && current < dayjs().subtract(2, "day").startOf("day");
                  }}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                  icon={<SaveOutlined />}
                >
                  {loading ? t("creating") : t("createTask")}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Space>
      </div>

      {/* RESTORE CONFIRMATION MODAL */}
      <RestoreFormModal
        open={showRestoreModal}
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
        translationKey="production.create"
      />

      {/* VALIDATION MODAL */}
      <Modal
        open={validationModalVisible}
        onCancel={handleValidationCancel}
        title={t("validationTitle") || "Raw Material Availability Check"}
        width={600}
        footer={[
          <Button key="cancel" onClick={handleValidationCancel}>
            {t("cancel") || "Cancel"}
          </Button>,
          <Button key="proceed" type="primary" onClick={handleValidationConfirm}>
            {t("proceedAnyway") || "Proceed Anyway"}
          </Button>,
        ]}
      >
        {validationData && (
          <div>
            <Alert
              message={t("validationWarning") || "Some raw materials are missing or insufficient"}
              description={t("validationDescription") || "Please review the issues below. You can proceed anyway, but this may cause problems during production."}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {validationData.issues.packagingMissing && validationData.issues.packagingMissing.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Typography.Title level={5} style={{ color: "#fa8c16" }}>
                  {t("packagingMissing") || "Packaging Materials Missing"}
                </Typography.Title>
                <List
                  size="small"
                  bordered
                  dataSource={validationData.issues.packagingMissing}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Typography.Text strong>{item.materialName}</Typography.Text>
                        <Typography.Text type="secondary">
                          {t("required") || "Required"}: {item.required.toFixed(2)} | {t("available") || "Available"}: {item.available.toFixed(2)}
                        </Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
                <Alert
                  message={t("packagingWarning") || "Packaging material is missing. Do you want to proceed?"}
                  type="info"
                  showIcon
                  style={{ marginTop: 8 }}
                />
              </div>
            )}

            {validationData.issues.missing && validationData.issues.missing.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Typography.Title level={5} style={{ color: "#ff4d4f" }}>
                  {t("materialsMissing") || "Materials Missing"}
                </Typography.Title>
                <List
                  size="small"
                  bordered
                  dataSource={validationData.issues.missing}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Typography.Text strong>{item.materialName}</Typography.Text>
                        <Typography.Text type="secondary">
                          {t("required") || "Required"}: {item.required.toFixed(2)} | {t("available") || "Available"}: {item.available.toFixed(2)}
                        </Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {validationData.issues.insufficient && validationData.issues.insufficient.length > 0 && (
              <div>
                <Typography.Title level={5} style={{ color: "#faad14" }}>
                  {t("materialsInsufficient") || "Materials Insufficient"}
                </Typography.Title>
                <List
                  size="small"
                  bordered
                  dataSource={validationData.issues.insufficient}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Typography.Text strong>{item.materialName}</Typography.Text>
                        <Typography.Text type="secondary">
                          {t("required") || "Required"}: {item.required.toFixed(2)} | {t("available") || "Available"}: {item.available.toFixed(2)} | {t("shortfall") || "Shortfall"}: {(item.required - item.available).toFixed(2)}
                        </Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
