"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  DatePicker,
  Button,
  Table,
  Collapse,
  Space,
  Statistic,
  Tag,
  message,
  Typography,
  Spin,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;

interface SnapshotItem {
  _id: string;
  itemName: string;
  category: string;
  currentCostPrice: number;
  snapshotQty: number;
}

export default function SnapshotPage() {
  const router = useRouter();
  const t = useTranslations("inventory.snapshot");
  const tAdd = useTranslations("inventory.add");
  const [messageApi, contextHolder] = message.useMessage();

  const [date, setDate] = useState<Dayjs | null>(null);
  const [data, setData] = useState<SnapshotItem[]>([]);
  const [loading, setLoading] = useState(false);

  const today = dayjs();

  // Fetch snapshot from server
  async function handleFetch() {
    if (!date) {
      messageApi.error(t("pickDateError"));
      return;
    }

    setLoading(true);
    try {
      const dateStr = date.format("YYYY-MM-DD");
      const res = await fetch(`/api/inventory/snapshot?date=${dateStr}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch snapshot: ${res.status} - ${text}`);
      }
      const results: SnapshotItem[] = await res.json();
      setData(results);
      messageApi.success(t("loadingSnapshot"));
    } catch (err: any) {
      console.error(err);
      messageApi.error(err.message || t("errorFetchingSnapshot"));
    }
    setLoading(false);
  }

  // Group items by category
  const grouped = data.reduce((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, SnapshotItem[]>);

  // Compute totals for each category and overall grand total
  let grandTotal = 0;
  const categoryEntries = Object.entries(grouped).map(([cat, items]) => {
    let categoryTotal = 0;
    items.forEach((it) => {
      const subtotal = it.snapshotQty * (it.currentCostPrice ?? 0);
      categoryTotal += subtotal;
    });
    grandTotal += categoryTotal;
    return { category: cat, items, categoryTotal };
  });

  // Export to Excel
  const handleExport = () => {
    if (data.length === 0) {
      messageApi.warning(t("noItems"));
      return;
    }

    const exportData: any[] = [];

    categoryEntries.forEach(({ category, items, categoryTotal }) => {
      const translatedCategory = tAdd(`categoryOptions.${category}`, {
        defaultValue: category,
      });

      // Add category header
      exportData.push({
        [t("table.itemName")]: `${t("categoryTitle", {
          category: translatedCategory,
        })}`,
        [t("table.quantity")]: "",
        [t("table.currentCostPrice")]: "",
        [t("table.subtotal")]: "",
      });

      // Add items
      items.forEach((it) => {
        const subtotal = it.snapshotQty * (it.currentCostPrice ?? 0);
        exportData.push({
          [t("table.itemName")]: it.itemName,
          [t("table.quantity")]: it.snapshotQty.toFixed(2),
          [t("table.currentCostPrice")]: `₪${(it.currentCostPrice ?? 0).toFixed(
            2
          )}`,
          [t("table.subtotal")]: `₪${subtotal.toFixed(2)}`,
        });
      });

      // Add category total
      exportData.push({
        [t("table.itemName")]: "",
        [t("table.quantity")]: "",
        [t("table.currentCostPrice")]: t("categoryTotal"),
        [t("table.subtotal")]: `₪${categoryTotal.toFixed(2)}`,
      });

      // Add empty row for spacing
      exportData.push({});
    });

    // Add grand total
    exportData.push({
      [t("table.itemName")]: "",
      [t("table.quantity")]: "",
      [t("table.currentCostPrice")]: t("grandTotal"),
      [t("table.subtotal")]: `₪${grandTotal.toFixed(2)}`,
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Snapshot");

    const dateStr = date ? date.format("YYYY-MM-DD") : "snapshot";
    XLSX.writeFile(workbook, `inventory-snapshot-${dateStr}.xlsx`);
    messageApi.success("Exported successfully");
  };

  // Table columns
  const columns = [
    {
      title: t("table.itemName"),
      dataIndex: "itemName",
      key: "itemName",
    },
    {
      title: t("table.quantity"),
      dataIndex: "snapshotQty",
      key: "snapshotQty",
      render: (qty: number) => qty.toFixed(2),
    },
    {
      title: t("table.currentCostPrice"),
      dataIndex: "currentCostPrice",
      key: "currentCostPrice",
      render: (price: number) => `₪${(price ?? 0).toFixed(2)}`,
    },
    {
      title: t("table.subtotal"),
      key: "subtotal",
      render: (_: any, record: SnapshotItem) => {
        const subtotal = record.snapshotQty * (record.currentCostPrice ?? 0);
        return `₪${subtotal.toFixed(2)}`;
      },
    },
  ];

  // Collapse items
  const collapseItems = categoryEntries.map(
    ({ category, items, categoryTotal }) => {
      const translatedCategory = tAdd(`categoryOptions.${category}`, {
        defaultValue: category,
      });

      return {
        key: category,
        label: (
          <Space>
            <Text strong style={{ fontSize: 16 }}>
              {translatedCategory}
            </Text>
            <Tag color="blue">₪{categoryTotal.toFixed(2)}</Tag>
          </Space>
        ),
        children: (
          <Table
            dataSource={items}
            columns={columns}
            rowKey="_id"
            pagination={false}
            footer={() => (
              <div style={{ textAlign: "right", fontWeight: "bold" }}>
                {t("categoryTotal")}:{" "}
                <Tag color="green">₪{categoryTotal.toFixed(2)}</Tag>
              </div>
            )}
          />
        ),
      };
    }
  );

  return (
    <div style={{ padding: "24px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", minHeight: "100vh" }}>
      {contextHolder}
      <Card style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          {/* Header with Back Button */}
          <Space style={{ justifyContent: "space-between", width: "100%" }}>
            <Button icon={<ArrowRightOutlined />} onClick={() => router.back()}>
              {t("back")}
            </Button>
          </Space>

          {/* Title */}
          <Title level={2} style={{ textAlign: "center", margin: 0 }}>
            {t("pageTitle")}
          </Title>

          {/* Date Picker and Fetch Button */}
          <Space wrap>
            <Text strong>{t("pickDate")}:</Text>
            <DatePicker
              value={date}
              onChange={setDate}
              maxDate={today}
              disabledDate={(current) =>
                current && current.isAfter(today, "day")
              }
              format="YYYY-MM-DD"
              style={{ width: 200 }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleFetch}
              loading={loading}
            >
              {t("fetchSnapshot")}
            </Button>
          </Space>

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <Spin size="large" />
            </div>
          )}

          {/* Results */}
          {!loading && data.length > 0 && (
            <>
              <Space>
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                >
                  Export to Excel
                </Button>
              </Space>

              <Collapse
                items={collapseItems}
                defaultActiveKey={categoryEntries.map((c) => c.category)}
              />

              {/* Grand Total */}
              <Card style={{ background: "#fafafa" }}>
                <Statistic
                  title={
                    <Text strong style={{ fontSize: 18 }}>
                      {t("grandTotal")}
                    </Text>
                  }
                  value={grandTotal.toFixed(2)}
                  prefix="₪"
                  valueStyle={{ color: "#3f8600", fontSize: 28 }}
                />
              </Card>
            </>
          )}

          {/* No Data Message */}
          {!loading && data.length === 0 && date && (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <Text type="secondary">{t("noItems")}</Text>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
}
