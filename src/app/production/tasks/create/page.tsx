"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Form, Select, InputNumber, DatePicker, Button, Card, Alert, Typography, Space, message } from "antd";
import { ArrowRightOutlined, SaveOutlined, PlusOutlined } from "@ant-design/icons";
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

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data: InventoryItem[]) => {
        const filtered = data.filter((item) =>
          ["FinalProduct", "SemiFinalProduct"].includes(item.category)
        );
        setInventoryItems(filtered);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        taskType: "Production",
        productionDate: values.productionDate.format("YYYY-MM-DD"),
        product: values.product,
        plannedQuantity: values.plannedQuantity,
        status: "Pending",
      };

      const res = await fetch("/api/production/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(t("errorCreatingTask"));

      messageApi.success(t("createTaskSuccess"));
      form.resetFields();
      
      setTimeout(() => {
        router.push("/welcome'");
      }, 1000);
    } catch (err: any) {
      setError(err.message);
      messageApi.error(err.message);
    }

    setLoading(false);
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
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Button
            icon={<ArrowRightOutlined />}
            onClick={() => router.back()}
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
            <Title level={2} style={{ marginBottom: "24px", textAlign: "center" }}>
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
                    return current && current < dayjs().startOf("day");
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
    </div>
  );
}
