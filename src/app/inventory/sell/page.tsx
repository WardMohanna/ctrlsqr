"use client";

import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
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
import { ShoppingOutlined, SaveOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  quantity: number;
}

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 15;

export default function SellItemsPage() {
  const router = useRouter();
  const t = useTranslations("inventory.sell");
  const { theme } = useTheme();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [itemsLoading, setItemsLoading] = useState<boolean>(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(
    null,
  );
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const loadInventoryItems = useCallback(
    async (searchTerm = "", page = 1, append = false) => {
      if (itemsLoading) {
        return;
      }

      setItemsLoading(true);

      try {
        const params = new URLSearchParams({
          category: "FinalProduct",
          fields: "_id,itemName,category,quantity",
          paginated: "true",
          page: String(page),
          limit: String(PAGE_SIZE),
          inStockOnly: "true",
        });

        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }

        const res = await fetch(`/api/inventory?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load products");
        }

        const data = await res.json();
        const nextItems = (data.items ?? []) as InventoryItem[];
        setInventoryItems((currentItems) =>
          append ? mergeUniqueItems(currentItems, nextItems) : nextItems,
        );
        setItemsPage(page);
        setItemSearchTerm(searchTerm);
        setHasMoreItems(page * PAGE_SIZE < (data.total ?? 0));
      } catch (fetchError) {
        console.error(fetchError);
        messageApi.error(t("errorSelling"));
      } finally {
        setItemsLoading(false);
      }
    },
    [itemsLoading, mergeUniqueItems, messageApi, t],
  );

  const ensureSelectedProductLoaded = useCallback(
    async (productId: string) => {
      if (!productId) {
        return;
      }

      try {
        const params = new URLSearchParams({
          itemId: productId,
          fields: "_id,itemName,category,quantity",
        });
        const res = await fetch(`/api/inventory?${params.toString()}`);
        if (!res.ok) {
          return;
        }

        const item: InventoryItem = await res.json();
        setInventoryItems((currentItems) => {
          if (currentItems.some((currentItem) => currentItem._id === item._id)) {
            return currentItems;
          }

          return mergeUniqueItems(currentItems, [item]);
        });
      } catch (fetchError) {
        console.error(fetchError);
      }
    },
    [mergeUniqueItems],
  );

  const handleProductSearch = useCallback(
    (value: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        loadInventoryItems(value, 1, false);
      }, SEARCH_DEBOUNCE_MS);
    },
    [loadInventoryItems],
  );

  const handlePopupScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.target as HTMLDivElement;
      const isNearBottom =
        target.scrollTop + target.clientHeight >= target.scrollHeight - 24;

      if (!isNearBottom || itemsLoading || !hasMoreItems) {
        return;
      }

      loadInventoryItems(itemSearchTerm, itemsPage + 1, true);
    },
    [hasMoreItems, itemSearchTerm, itemsLoading, itemsPage, loadInventoryItems],
  );

  const handleProductChange = (productId: string) => {
    const product = inventoryItems.find((item) => item._id === productId);
    setSelectedProduct(product || null);
    ensureSelectedProductLoaded(productId);
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
      setInventoryItems((currentItems) =>
        currentItems
          .map((item) =>
            item._id === values.product
              ? { ...item, quantity: Math.max(0, item.quantity - values.quantity) }
              : item,
          )
          .filter((item) => item.quantity > 0),
      );

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
        background: theme === "dark" ? "#1f2329" : "#f3f4f6",
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
              border: "none",
              boxShadow:
                theme === "dark"
                  ? "0 6px 20px rgba(0, 0, 0, 0.6)"
                  : "0 4px 12px rgba(0, 0, 0, 0.08)",
              background: theme === "dark" ? "#000000" : "#ffffff",
            }}
          >
            <Title
              level={2}
              style={{
                marginBottom: "24px",
                textAlign: "center",
                color: theme === "dark" ? "#ffffff" : "var(--header-bg)",
              }}
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
                message={t("availableQuantity", {
                  quantity: selectedProduct.quantity,
                })}
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
                  loading={itemsLoading}
                  onChange={handleProductChange}
                  onFocus={() => {
                    if (inventoryItems.length === 0) {
                      loadInventoryItems("", 1, false);
                    }
                  }}
                  onPopupScroll={handlePopupScroll}
                  onSearch={handleProductSearch}
                  filterOption={false}
                  notFoundContent={
                    itemsLoading
                      ? t("loadingProducts", {
                          defaultValue: "Loading products...",
                        })
                      : t("noProductsFound", {
                          defaultValue: "No products found",
                        })
                  }
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
                        return Promise.reject(
                          new Error(t("errorInsufficientQuantity")),
                        );
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
