"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Table,
  Input,
  Card,
  Button,
  Modal,
  Space,
  Typography,
  Tag,
  Spin,
  Alert,
  Select,
} from "antd";
import {
  SearchOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { ColumnsType, TableProps } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";

const { Title, Text } = Typography;

interface ComponentLine {
  componentId: {
    _id: string;
    itemName: string;
    unit?: string;
    currentCostPrice?: number;
    category: string;
  };
  percentage: number;
  partialCost?: number;
  quantityUsed?: number;
}

interface InventoryItem {
  _id: string;
  sku: string;
  itemName: string;
  category: string;
  quantity: number;
  unit?: string;
  currentCostPrice?: number;
  currentClientPrice?: number;
  currentBusinessPrice?: number;
  standardBatchWeight?: number;
  components?: ComponentLine[];
}

type SortColumn =
  | "sku"
  | "itemName"
  | "category"
  | "quantity"
  | "unit"
  | "currentCostPrice"
  | "currentClientPrice"
  | "currentBusinessPrice";

type SortDirection = "asc" | "desc";


export default function ShowInventory() {
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]); // Array for multiple categories
  const [sortColumn, setSortColumn] = useState<SortColumn>("category");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // For BOM modal
  const [openBOMItem, setOpenBOMItem] = useState<InventoryItem | null>(null);

  // Import translations
  const t = useTranslations("inventory.show");
  const tAdd = useTranslations("inventory.add");

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => {
        setInventory(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching inventory:", err);
        setError(t("errorLoadingInventory"));
        setLoading(false);
      });
  }, [t]);

  // Helper: Translate Values
  const getTranslatedValue = useCallback((
    type: "category" | "unit",
    value: string | undefined
  ) => {
    if (!value) return "-";
    if (type === "category") {
      return tAdd(`categoryOptions.${value}`, { defaultValue: value });
    }
    if (type === "unit") {
      return tAdd(`unitOptions.${value}`, { defaultValue: value });
    }
    return value;
  }, [tAdd]);

  // Filter data based on search term and category
  const filteredData = useMemo(() => {
    let filtered = inventory;

    // Apply category filter (if any categories are selected)
    if (categoryFilter.length > 0) {
      filtered = filtered.filter((item) => categoryFilter.includes(item.category));
    }

    // Apply search filter
    if (!searchTerm) return filtered;

    const lowerTerm = searchTerm.toLowerCase();
    return filtered.filter((item) => {
      const translatedCategory = getTranslatedValue(
        "category",
        item.category
      ).toLowerCase();
      const translatedUnit = getTranslatedValue("unit", item.unit).toLowerCase();

      const fields = [
        item.sku.toLowerCase(),
        item.itemName.toLowerCase(),
        translatedCategory,
        item.quantity.toString(),
        translatedUnit,
        (item.currentCostPrice ?? "").toString(),
        (item.currentClientPrice ?? "").toString(),
        (item.currentBusinessPrice ?? "").toString(),
      ];
      return fields.some((field) => field.includes(lowerTerm));
    });
  }, [inventory, searchTerm, categoryFilter, getTranslatedValue]);

  // Get unique categories from inventory
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(inventory.map((item) => item.category)));
    return uniqueCategories.map((cat) => ({
      value: cat,
      label: getTranslatedValue("category", cat),
    }));
  }, [inventory, getTranslatedValue]);

  // Calculate total BOM cost
  const totalBOMCost =
    openBOMItem?.components?.reduce((sum, comp) => {
      const rm = comp.componentId;
      const qty = comp.quantityUsed ?? 0;
      const cost =
        rm.category === "Packaging"
          ? (rm.currentCostPrice ?? 0) * qty
          : comp.partialCost ?? 0;
      return sum + cost;
    }, 0) ?? 0;

  // Define table columns
  const columns: ColumnsType<InventoryItem> = [
    {
      title: t("sku"),
      dataIndex: "sku",
      key: "sku",
      sorter: (a, b) => a.sku.localeCompare(b.sku),
      width: 120,
    },
    {
      title: t("itemName"),
      dataIndex: "itemName",
      key: "itemName",
      sorter: (a, b) => a.itemName.localeCompare(b.itemName),
    },
    {
      title: t("category"),
      dataIndex: "category",
      key: "category",
      sorter: (a, b) => {
        const catA = getTranslatedValue("category", a.category);
        const catB = getTranslatedValue("category", b.category);
        return catA.localeCompare(catB);
      },
      render: (category: string) => (
        <Tag color="blue">{getTranslatedValue("category", category)}</Tag>
      ),
    },
    {
      title: t("quantity"),
      dataIndex: "quantity",
      key: "quantity",
      sorter: (a, b) => a.quantity - b.quantity,
      render: (qty: number) => qty.toFixed(2),
      align: "right",
      width: 100,
    },
    {
      title: t("unit"),
      dataIndex: "unit",
      key: "unit",
      sorter: (a, b) => {
        const unitA = getTranslatedValue("unit", a.unit);
        const unitB = getTranslatedValue("unit", b.unit);
        return unitA.localeCompare(unitB);
      },
      render: (unit: string | undefined) => getTranslatedValue("unit", unit),
      width: 100,
    },
    {
      title: t("costPrice"),
      dataIndex: "currentCostPrice",
      key: "currentCostPrice",
      sorter: (a, b) =>
        (a.currentCostPrice ?? 0) - (b.currentCostPrice ?? 0),
      render: (price: number | undefined) =>
        price !== undefined ? `₪${price.toFixed(2)}` : "-",
      align: "right",
      width: 120,
    },
    {
      title: t("businessPrice"),
      dataIndex: "currentBusinessPrice",
      key: "currentBusinessPrice",
      sorter: (a, b) =>
        (a.currentBusinessPrice ?? 0) - (b.currentBusinessPrice ?? 0),
      render: (price: number | undefined) =>
        price !== undefined ? `₪${price.toFixed(2)}` : "-",
      align: "right",
      width: 120,
    },
    {
      title: t("bom"),
      key: "bom",
      render: (_, record) => {
        const hasBOM = record.components && record.components.length > 0;
        return hasBOM ? (
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setOpenBOMItem(record)}
          >
            {t("viewBOM")}
          </Button>
        ) : (
          "-"
        );
      },
      align: "center",
      width: 120,
    },
  ];

  // BOM Modal columns
  const bomColumns: ColumnsType<ComponentLine> = [
    {
      title: t("componentLabel"),
      key: "component",
      render: (_, record) =>
        record.componentId.itemName || t("unknownComponent"),
    },
    {
      title: t("percentage"),
      key: "percentage",
      render: (_, record) => {
        const isPackaging = record.componentId.unit === "pieces";
        return isPackaging ? "-" : `${record.percentage.toFixed(2)}%`;
      },
      align: "right",
      width: 120,
    },
    {
      title: t("gramsLabel"),
      key: "quantity",
      render: (_, record) => {
        const qty = record.quantityUsed ?? 0;
        const isPackaging = record.componentId.unit === "pieces";
        return isPackaging ? `${qty} pcs` : `${qty} g`;
      },
      align: "right",
      width: 120,
    },
    {
      title: t("partialCost"),
      key: "partialCost",
      render: (_, record) => {
        const rm = record.componentId;
        const qty = record.quantityUsed ?? 0;
        const isPackaging = rm.unit === "pieces";
        const costValue = isPackaging
          ? (rm.currentCostPrice ?? 0) * qty
          : record.partialCost ?? 0;
        return costValue > 0 ? `₪${costValue.toFixed(2)}` : "-";
      },
      align: "right",
      width: 120,
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f0f2f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <Spin size="large" tip={t("loadingInventory")}> 
          <div style={{ minHeight: 80 }} />
        </Spin>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f0f2f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <Alert message={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "24px",
      }}
    >
      <Card
        title={
          <Title level={2} style={{ margin: 0 }}>
            {t("inventoryListTitle")}
          </Title>
        }
        extra={
          <Space>
            <Select
              mode="multiple"
              placeholder={t("categoryFilterPlaceholder") || "Filter by category"}
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categories}
              style={{ minWidth: 250 }}
              allowClear
            />
            <Input
              placeholder={t("searchPlaceholder")}
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
            >
              {t("back")}
            </Button>
          </Space>
        }
        style={{ maxWidth: 1400, margin: "0 auto" }}
      >
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `${total} ${t("noMatchingItems") || "items"}`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          scroll={{ x: 1000 }}
          bordered
          size="middle"
        />
      </Card>

      {/* BOM Modal */}
      <Modal
        title={
          <Space>
            <Text strong>{t("bomFor")}</Text>
            <Text type="secondary">{openBOMItem?.itemName}</Text>
          </Space>
        }
        open={!!openBOMItem}
        onCancel={() => setOpenBOMItem(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setOpenBOMItem(null)}>
            {t("back") || "Close"}
          </Button>,
        ]}
        width={800}
      >
        {openBOMItem && (
          <>
            <Space style={{ marginBottom: 16 }} size="large">
              <Text>
                <strong>{t("productWeight")}:</strong>{" "}
                {openBOMItem.standardBatchWeight
                  ? `${openBOMItem.standardBatchWeight} g`
                  : "0 g"}
              </Text>
              <Text>
                <strong>{t("totalCostLabel")}:</strong> ₪
                {totalBOMCost.toFixed(2)}
              </Text>
            </Space>
            <Table
              columns={bomColumns}
              dataSource={openBOMItem.components}
              rowKey={(record, index) =>
                `${record.componentId._id}-${index}`
              }
              pagination={false}
              bordered
              size="small"
            />
          </>
        )}
      </Modal>
    </div>
  );
}