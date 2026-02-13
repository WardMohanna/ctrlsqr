"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import BackButton from "@/components/BackButton";
import {
  Form,
  Select,
  InputNumber,
  Button,
  Card,
  Alert,
  Typography,
  Space,
  message,
} from "antd";
import {
  ShoppingOutlined,
  SaveOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  quantity: number;
}

export default function SellItemsPage() {
  const router = useRouter();
  const t = useTranslations("inventory.sell");
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  useEffect(() => {
    fetch("/api/inventory?category=FinalProduct&fields=_id,itemName,category,quantity")
      .then((res) => res.json())
      .then((data: InventoryItem[]) => {
        setInventoryItems(data.filter(item => item.quantity > 0));
      })
      .catch(console.error);
  }, []);

  const handleProductChange = (productId: string) => {
    const product = inventoryItems.find(item => item._id === productId);
    setSelectedProduct(product || null);
    // Reset quantity when product changes
    form.setFieldValue("quantity", undefined);
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        productId: values.product,
        quantity: values.quantity,
      };

      const res = await fetch("/api/inventory/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("errorSelling"));
      }

      messageApi.success(t("sellSuccess"));
      form.resetFields();
      setSelectedProduct(null);

      // Refresh inventory items to update quantities
      const refreshRes = await fetch("/api/inventory?category=FinalProduct&fields=_id,itemName,category,quantity");
      const refreshData = await refreshRes.json();
      setInventoryItems(refreshData.filter((item: InventoryItem) => item.quantity > 0));

      setTimeout(() => {
        router.push("/welcomePage");
      }, 1500);
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
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <BackButton onClick={() => router.push("/welcomePage")} size="large">
            {t("back")}
          </BackButton>

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
              <ShoppingOutlined /> {t("pageTitle")}
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

            {selectedProduct && (
              <Alert
                message={t("availableQuantity", { quantity: selectedProduct.quantity })}
                type="info"
                showIcon
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
                  onChange={handleProductChange}
                  options={inventoryItems.map((item) => ({
                    label: `${item.itemName} (${t("availableQuantity", { quantity: item.quantity })})`,
                    value: item._id,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="quantity"
                label={t("quantityLabel")}
                rules={[
                  { required: true, message: t("errorInvalidQuantity") },
                  {
                    type: "number",
                    min: 1,
                    message: t("errorInvalidQuantity"),
                  },
                  {
                    validator: (_, value) => {
                      if (selectedProduct && value > selectedProduct.quantity) {
                        return Promise.reject(new Error(t("errorInsufficientQuantity")));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber
                  placeholder={t("quantityPlaceholder")}
                  style={{ width: "100%" }}
                  min={1}
                  max={selectedProduct?.quantity || undefined}
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
                  {loading ? t("selling") : t("sellButton")}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Space>
      </div>
    </div>
  );
}
