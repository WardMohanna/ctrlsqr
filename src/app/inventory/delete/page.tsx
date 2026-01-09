"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, Select, Button, message, Modal, Space } from "antd";
import { DeleteOutlined, ArrowRightOutlined, CheckCircleOutlined } from "@ant-design/icons";

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  // add other fields if needed
}

export default function DeleteInventoryItem() {
  const router = useRouter();
  const t = useTranslations("inventory.delete");

  // State to store inventory items
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  // Fetch inventory on mount
  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => {
        setInventoryItems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(t("errorLoadingInventory"), err);
        messageApi.error(t("errorLoadingInventory"));
        setLoading(false);
      });
  }, [t, messageApi]);

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

    const itemName = inventoryItems.find(it => it._id === selectedItem)?.itemName || "";

    Modal.confirm({
      title: t("confirmDelete", { itemName }),
      icon: <DeleteOutlined style={{ color: "#ff4d4f" }} />,
      okText: t("deleteButton"),
      okType: "danger",
      cancelText: t("back"),
      onOk: async () => {
        try {
          const response = await fetch(`/api/inventory?itemId=${selectedItem}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || t("deleteError"));
          }

          messageApi.success(t("deleteSuccess", { itemName }));
          setTimeout(() => router.push("/"), 1500);
        } catch (err: any) {
          console.error("Error deleting item:", err);
          messageApi.error(err.message);
        }
      },
    });
  }

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "calc(100vh - 64px)" }}>
      {contextHolder}
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>
                {t("title")}
              </h1>
              <Button icon={<ArrowRightOutlined />} onClick={() => router.back()}>
                {t("back")}
              </Button>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("selectItemLabel")}
              </label>
              <Select
                style={{ width: "100%" }}
                options={itemOptions}
                value={selectedItem}
                onChange={(val) => setSelectedItem(val)}
                placeholder={t("selectPlaceholder")}
                loading={loading}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
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
