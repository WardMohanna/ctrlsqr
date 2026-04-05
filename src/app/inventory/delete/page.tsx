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
const PAGE_SIZE = 15;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
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

  const loadItemList = useCallback((nextSearchTerm = "", page = 1, append = false) => {
    if (loading) {
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({
      paginated: "true",
      page: String(page),
      limit: String(PAGE_SIZE),
      fields: "_id,itemName,category",
    });

    if (nextSearchTerm.trim()) {
      params.set("search", nextSearchTerm.trim());
    }

    fetch(`/api/inventory?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const nextItems = data.items ?? [];
        setInventoryItems((currentItems) =>
          append ? mergeUniqueItems(currentItems, nextItems) : nextItems,
        );
        setCurrentPage(page);
        setSearchTerm(nextSearchTerm);
        setHasMoreItems(page * PAGE_SIZE < (data.total ?? 0));
        setLoading(false);
      })
      .catch((err) => {
        console.error(t("errorLoadingInventory"), err);
        messageApi.error(t("errorLoadingInventory"));
        setLoading(false);
      });
  }, [loading, mergeUniqueItems, messageApi, t]);

  const handleSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadItemList(value, 1, false);
    }, SEARCH_DEBOUNCE_MS);
  }, [loadItemList]);

  const handlePopupScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.target as HTMLDivElement;
      const isNearBottom =
        target.scrollTop + target.clientHeight >= target.scrollHeight - 24;

      if (!isNearBottom || loading || !hasMoreItems) {
        return;
      }

      loadItemList(searchTerm, currentPage + 1, true);
    },
    [currentPage, hasMoreItems, loadItemList, loading, searchTerm],
  );

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
                onFocus={() => {
                  if (inventoryItems.length === 0) {
                    loadItemList("", 1, false);
                  }
                }}
                onPopupScroll={handlePopupScroll}
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
