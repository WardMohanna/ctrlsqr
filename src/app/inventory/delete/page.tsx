"use client";

import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { Card, Select, Button, message, Modal, Space } from "antd";
import BackButton from "@/components/BackButton";
import { DeleteOutlined, CheckCircleOutlined } from "@ant-design/icons";

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  // add other fields if needed
}

const SEARCH_DEBOUNCE_MS = 250;

export default function DeleteInventoryItem() {
  const router = useRouter();
  const goUp = useNavigateUp();
  const t = useTranslations("inventory.delete");
  const { theme } = useTheme();

  // State to store inventory items
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadItemList = useCallback((searchTerm = "") => {
    setLoading(true);
    const params = new URLSearchParams({
      paginated: "true",
      limit: "15",
      fields: "_id,itemName,category",
    });

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    }

    fetch(`/api/inventory?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setInventoryItems(data.items ?? []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(t("errorLoadingInventory"), err);
        messageApi.error(t("errorLoadingInventory"));
        setLoading(false);
      });
  }, [messageApi, t]);

  const handleSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadItemList(value);
    }, SEARCH_DEBOUNCE_MS);
  }, [loadItemList]);

  // Build select options
  const itemOptions = inventoryItems.map((it) => ({
    value: it._id,
    label: it.itemName,
  }));

  // Handle delete
  async function handleDelete() {
    if (!selectedItem) {
      messageApi.warning(t("noItemSelected"));
      return;
    }

    const itemName =
      inventoryItems.find((it) => it._id === selectedItem)?.itemName || "";

    Modal.confirm({
      title: t("confirmDelete", { itemName }),
      icon: <DeleteOutlined style={{ color: "#ff4d4f" }} />,
      okText: t("deleteButton"),
      okType: "danger",
      cancelText: t("back"),
      onOk: async () => {
        try {
          const response = await fetch(
            `/api/inventory?itemId=${selectedItem}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || t("deleteError"));
          }

          messageApi.success(t("deleteSuccess", { itemName }));
          setTimeout(() => router.push("/welcomePage"), 300);
        } catch (err: any) {
          console.error("Error deleting item:", err);
          messageApi.error(err.message);
        }
      },
    });
  }

  return (
    <div
      style={{
        padding: "24px",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <BackButton onClick={goUp}>{t("back")}</BackButton>
        </div>
        <Card>
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                margin: 0,
                textAlign: "center",
              }}
            >
              {t("title")}
            </h1>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 500,
                }}
              >
                {t("selectItemLabel")}
              </label>
              <Select
                style={{ width: "100%" }}
                options={itemOptions}
                value={selectedItem}
                onChange={(val) => setSelectedItem(val)}
                onFocus={() => loadItemList()}
                onSearch={handleSearch}
                placeholder={
                  loading
                    ? t("loadingItems") || "Loading items..."
                    : t("selectPlaceholder")
                }
                loading={loading}
                showSearch
                filterOption={false}
                notFoundContent={
                  loading
                    ? t("loadingItems")
                    : t("noItemsFound") || "No items found"
                }
              />
            </div>

            <Button
              type="primary"
              danger
              size="large"
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              block
              disabled={!selectedItem}
            >
              {t("deleteButton")}
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
}
