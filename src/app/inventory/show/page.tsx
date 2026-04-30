"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { calculateMaterialCost, isPiecesUnit } from "@/lib/costUtils";
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
  Grid,
} from "antd";
import {
  SearchOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;
const SEARCH_DEBOUNCE_MS = 350;

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

interface InventoryListItem {
  _id: string;
  sku: string;
  itemName: string;
  category: string;
  quantity: number;
  minQuantity?: number;
  unit?: string;
  currentCostPrice?: number;
  currentClientPrice?: number;
  currentBusinessPrice?: number;
  standardBatchWeight?: number;
  components?: Array<{
    componentId?: string;
    percentage?: number;
    quantityUsed?: number;
  }>;
}

interface InventoryItemDetail {
  _id: string;
  sku: string;
  itemName: string;
  category: string;
  quantity: number;
  minQuantity?: number;
  unit?: string;
  currentCostPrice?: number;
  currentClientPrice?: number;
  currentBusinessPrice?: number;
  standardBatchWeight?: number;
  components?: ComponentLine[];
}

export default function ShowInventory() {
  const goUp = useNavigateUp();
  const { theme } = useTheme();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const [inventory, setInventory] = useState<InventoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedInventory, setHasLoadedInventory] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [bomLoading, setBomLoading] = useState(false);
  const topRef = useRef<HTMLDivElement | null>(null);

  // Search & sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]); // Array for multiple categories

  // For BOM modal
  const [openBOMItem, setOpenBOMItem] = useState<InventoryItemDetail | null>(
    null,
  );
  const [categories, setCategories] = useState<
    { value: string; label: string }[]
  >([]);
  const [pageSize, setPageSize] = useState(15);
  const [filteredData, setFilteredData] = useState<InventoryListItem[]>([]);

  // Import translations
  const t = useTranslations("inventory.show");
  const tAdd = useTranslations("inventory.add");

  useEffect(() => {
    fetch("/api/inventory?fields=category")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load categories");
        }
        return res.json();
      })
      .then((data) => {
        const nextCategories = Array.isArray(data)
          ? data.map((category: string) => ({
              value: category,
              label: getTranslatedValue("category", category),
            }))
          : [];

        setCategories(nextCategories);
      })
      .catch((err) => {
        console.error("Error loading categories:", err);
      });
  }, [tAdd]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setCurrentPage(1);
      setHasMoreItems(true);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      paginated: "true",
      page: currentPage.toString(),
      limit: pageSize.toString(),
      fields:
        "_id,sku,itemName,category,quantity,minQuantity,unit,currentCostPrice,currentClientPrice,currentBusinessPrice,standardBatchWeight,components",
    });

    if (debouncedSearchTerm) {
      params.set("search", debouncedSearchTerm);
    }

    if (categoryFilter.length > 0) {
      params.set("category", categoryFilter.join(","));
    }

    if (currentPage === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    fetch(`/api/inventory?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        const nextItems = data.items ?? [];
        setInventory((currentItems) =>
          currentPage === 1 ? nextItems : [...currentItems, ...nextItems],
        );
        setTotal(data.total ?? 0);
        setHasMoreItems(currentPage * pageSize < (data.total ?? 0));
        setHasLoadedInventory(true);
        setLoading(false);
        setLoadingMore(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") {
          return;
        }
        console.error("Error fetching inventory:", err);
        setError(t("errorLoadingInventory"));
        setHasLoadedInventory(true);
        setLoading(false);
        setLoadingMore(false);
      });

    return () => controller.abort();
  }, [currentPage, pageSize, debouncedSearchTerm, categoryFilter, t]);

  // Sync inventory to filteredData whenever inventory changes
  useEffect(() => {
    setFilteredData(inventory);
  }, [inventory]);

  const handleTableScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const isNearBottom =
        target.scrollTop + target.clientHeight >= target.scrollHeight - 24;

      if (!isNearBottom || loading || loadingMore || !hasMoreItems) {
        return;
      }

      setCurrentPage((page) => page + 1);
    },
    [hasMoreItems, loading, loadingMore],
  );

  // Helper: Translate Values
  const getTranslatedValue = useCallback(
    (type: "category" | "unit", value: string | undefined) => {
      if (!value) return "-";
      const key =
        type === "category"
          ? `categoryOptions.${value}`
          : `unitOptions.${value}`;
      const translated = tAdd(key);
      // If translation returns the key path, fallback to raw value
      if (translated === key || translated.includes("Options.")) {
        return value;
      }
      return translated;
    },
    [tAdd],
  );

  // Helper function to calculate item cost
  // For items with BOM: calculate sum of all component costs
  // For items without BOM: return currentCostPrice
  const calculateItemCost = useCallback(
    (item: InventoryListItem | InventoryItemDetail): number => {
      if (
        item.components &&
        item.components.length > 0 &&
        typeof item.components[0]?.componentId === "object"
      ) {
        const bomCost = item.components.reduce((sum, comp) => {
          const rm = comp.componentId as ComponentLine["componentId"];
          if (!rm) return sum;
          const qty = comp.quantityUsed ?? 0;
          const cost = calculateMaterialCost(rm, qty);
          return sum + cost;
        }, 0);
        // Fall back to stored currentCostPrice when BOM calculation returns 0
        // (e.g. items created with percentage-based formula where quantityUsed is 0)
        return bomCost > 0 ? bomCost : (item.currentCostPrice ?? 0);
      }
      return item.currentCostPrice ?? 0;
    },
    [],
  );

  // Calculate total BOM cost for modal
  const totalBOMCost =
    openBOMItem?.components?.reduce((sum, comp) => {
      const rm = comp.componentId;
      if (!rm) return sum; // Skip if component not populated
      const qty = comp.quantityUsed ?? 0;
      const cost = calculateMaterialCost(rm, qty);
      return sum + cost;
    }, 0) ?? 0;

  // Helper function to determine stock status: "critical" (RED), "warning" (YELLOW), or "normal"
  const getStockStatus = (
    item: InventoryListItem,
  ): "critical" | "warning" | "normal" => {
    const minQty = item.minQuantity ?? 0;
    if (minQty === 0) return "normal";

    // Critical: quantity is below minimum
    if (item.quantity < minQty) return "critical";

    // Warning: quantity is within 10% above minimum
    const warningThreshold = minQty * 1.1;
    if (item.quantity < warningThreshold) return "warning";

    return "normal";
  };

  // Define table columns
  const handleOpenBOM = useCallback(
    async (itemId: string) => {
      try {
        setBomLoading(true);
        const response = await fetch(
          `/api/inventory?itemId=${encodeURIComponent(itemId)}&includeComponents=true`,
        );

        if (!response.ok) {
          throw new Error("Failed to load BOM details");
        }

        const data = await response.json();
        setOpenBOMItem(data);
      } catch (err) {
        console.error("Error fetching BOM details:", err);
        setError(t("errorLoadingInventory"));
      } finally {
        setBomLoading(false);
      }
    },
    [t],
  );

  const columns: ColumnsType<InventoryListItem> = [
    {
      title: t("sku"),
      dataIndex: "sku",
      key: "sku",
      sorter: (a, b) => a.sku.localeCompare(b.sku),
      width: 120,
      render: (sku: string, record: InventoryListItem) => {
        const status = getStockStatus(record);
        const isBold = status !== "normal";
        return (
          <span style={{ fontWeight: isBold ? "bold" : "normal" }}>{sku}</span>
        );
      },
    },
    {
      title: t("itemName"),
      dataIndex: "itemName",
      key: "itemName",
      sorter: (a, b) => a.itemName.localeCompare(b.itemName),
      render: (name: string, record: InventoryListItem) => {
        const status = getStockStatus(record);
        const isBold = status !== "normal";
        return (
          <span style={{ fontWeight: isBold ? "bold" : "normal" }}>{name}</span>
        );
      },
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
        <Tag color="blue" style={{ fontWeight: 700 }}>
          {getTranslatedValue("category", category)}
        </Tag>
      ),
    },
    {
      title: t("quantity"),
      dataIndex: "quantity",
      key: "quantity",
      sorter: (a, b) => a.quantity - b.quantity,
      render: (qty: number, record: InventoryListItem) => {
        const status = getStockStatus(record);
        const isBold = status !== "normal";
        return (
          <span style={{ fontWeight: isBold ? "bold" : "normal" }}>
            {qty.toFixed(2)}
          </span>
        );
      },
      align: "right",
      width: 100,
    },
    {
      title: t("minQuantity") || "Min Qty",
      dataIndex: "minQuantity",
      key: "minQuantity",
      sorter: (a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0),
      render: (minQty: number | undefined) =>
        minQty !== undefined ? minQty.toFixed(2) : "-",
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
      sorter: (a, b) => {
        const costA = calculateItemCost(a);
        const costB = calculateItemCost(b);
        return costA - costB;
      },
      render: (_: number | undefined, record: InventoryListItem) => {
        const cost = calculateItemCost(record);
        return cost > 0 ? `₪${cost.toFixed(2)}` : "-";
      },
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
            onClick={() => handleOpenBOM(record._id)}
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
        record.componentId?.itemName || t("unknownComponent"),
    },
    {
      title: t("percentage"),
      key: "percentage",
      render: (_, record) => {
        if (!record.componentId) return "-";
        const isPackaging = isPiecesUnit(record.componentId.unit);
        return isPackaging ? "-" : `${record.percentage.toFixed(2)}%`;
      },
      align: "right",
      width: 120,
    },
    {
      title: t("gramsLabel"),
      key: "quantity",
      render: (_, record) => {
        if (!record.componentId) return "-";
        const qty = record.quantityUsed ?? 0;
        const isPackaging = isPiecesUnit(record.componentId.unit);
        const unitLabel = isPackaging
          ? t("unitAbbreviations.pcs")
          : t("unitAbbreviations.g");
        return `${qty} ${unitLabel}`;
      },
      align: "right",
      width: 120,
    },
    {
      title: t("costPrice"),
      key: "costPrice",
      render: (_, record) => {
        if (!record.componentId) return "-";
        const costPrice = record.componentId.currentCostPrice ?? 0;
        return costPrice > 0 ? `₪${costPrice.toFixed(2)}` : "-";
      },
      align: "right",
      width: 120,
    },
    {
      title: t("partialCost"),
      key: "partialCost",
      render: (_, record) => {
        const rm = record.componentId;
        if (!rm) return "-";
        const qty = record.quantityUsed ?? 0;
        const costValue = calculateMaterialCost(rm, qty);
        return costValue > 0 ? `₪${costValue.toFixed(2)}` : "-";
      },
      align: "right",
      width: 120,
    },
  ];

  if (loading && !hasLoadedInventory) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: theme === "dark" ? "#1f1f1f" : "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <Spin
          size="large"
          indicator={<LoadingOutlined spin style={{ color: "#132c4b" }} />}
          tip={t("loadingInventory")}
        >
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
          background: theme === "dark" ? "#1f1f1f" : "#ffffff",
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
      ref={topRef}
      style={{
        minHeight: "100vh",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
        padding: isMobile ? "12px" : "24px",
      }}
    >
      <style>{`
        .ant-table {
          background-color: ${theme === "dark" ? "#2d2d2d" : "#ffffff"} !important;
        }
        .ant-table-header {
          background-color: #1f1f1f !important;
        }
        .ant-table-thead > tr > th {
          background-color: #1f1f1f !important;
          color: #ffffff !important;
          border-color: #404040 !important;
        }
        .ant-table-body > tr > td {
          border-color: #404040 !important;
        }
        .critical-stock-row {
          background-color: #ffd9b3 !important;
          color: #2b2b2b !important;
        }
        .critical-stock-row > td {
          color: #2b2b2b !important;
        }
        .critical-stock-row:hover > td {
          background-color: #ffbf80 !important;
          color: #2b2b2b !important;
        }
        .warning-stock-row {
          background-color: #fff3a3 !important;
          color: #2b2b2b !important;
        }
        .warning-stock-row > td {
          color: #2b2b2b !important;
        }
        .warning-stock-row:hover > td {
          background-color: #ffe066 !important;
          color: #2b2b2b !important;
        }
        .normal-stock-row {
          background-color: ${theme === "dark" ? "#2d2d2d" : "#ffffff"} !important;
          color: ${theme === "dark" ? "#ffffff" : "#2b2b2b"} !important;
        }
        .normal-stock-row > td {
          color: ${theme === "dark" ? "#ffffff" : "#2b2b2b"} !important;
          border-color: ${theme === "dark" ? "#404040" : "#f0f0f0"} !important;
        }
        .normal-stock-row:hover > td {
          background-color: ${theme === "dark" ? "#3d3d3d" : "#fafafa"} !important;
        }
        .inventory-show-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        @media (max-width: 767px) {
          .inventory-show-card .ant-card-head {
            align-items: flex-start;
          }

          .inventory-show-card .ant-card-head-wrapper {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .inventory-show-card .ant-card-extra {
            margin-inline-start: 0;
            width: 100%;
          }

          .inventory-show-table-wrap .ant-table-wrapper::before {
            justify-content: flex-start !important;
          }
        }
      `}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto 16px" }}>
        <BackButton onClick={goUp}>{t("back")}</BackButton>
      </div>
      <Card
        className="inventory-show-card"
        title={
          <Title level={2} style={{ margin: 0 }}>
            {t("inventoryListTitle")}
          </Title>
        }
        extra={
          <Space
            orientation={isMobile ? "vertical" : "horizontal"}
            size="middle"
            style={{ width: isMobile ? "100%" : undefined }}
          >
            <Select
              mode="multiple"
              placeholder={
                t("categoryFilterPlaceholder") || "Filter by category"
              }
              value={categoryFilter}
              onChange={(value) => {
                setCategoryFilter(value);
                setCurrentPage(1);
                setHasMoreItems(true);
              }}
              options={categories}
              style={{ width: isMobile ? "100%" : 250 }}
              allowClear
            />
            <Input
              placeholder={t("searchPlaceholder")}
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: isMobile ? "100%" : 250 }}
              allowClear
            />
          </Space>
        }
        style={{ maxWidth: 1400, margin: "0 auto" }}
      >
        <Space
          orientation="vertical"
          style={{ width: "100%", marginBottom: "20px" }}
        >
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                maxWidth: isMobile ? "100%" : undefined,
                wordBreak: "break-word",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#ffd9b3",
                  border: "1px solid #ff9f4d",
                  borderRadius: "2px",
                }}
              />
              <span>
                <strong>{t("criticalStockLabel")}:</strong>{" "}
                {t("criticalStockDescription")}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                maxWidth: isMobile ? "100%" : undefined,
                wordBreak: "break-word",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#fff3a3",
                  border: "1px solid #ffcf33",
                  borderRadius: "2px",
                }}
              />
              <span>
                <strong>{t("warningStockLabel")}:</strong>{" "}
                {t("warningStockDescription")}
              </span>
            </div>
          </div>
        </Space>
        <div className="inventory-show-table-wrap">
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: pageSize,
              showSizeChanger: true,
              showTotal: (total) =>
                `${total} ${t("noMatchingItems") || "items"}`,
              pageSizeOptions: ["10", "20", "50", "100"],
              onShowSizeChange: (current, size) => setPageSize(size),
            }}
            scroll={{ x: "max-content" }}
            bordered
            size="middle"
            rowClassName={(record: InventoryListItem) => {
              const status = getStockStatus(record);
              if (status === "critical") return "critical-stock-row";
              if (status === "warning") return "warning-stock-row";
              return "normal-stock-row";
            }}
          />
        </div>
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
          <Button
            key="close"
            type="primary"
            onClick={() => setOpenBOMItem(null)}
          >
            {t("back") || "Close"}
          </Button>,
        ]}
        width={800}
      >
        {bomLoading ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Spin />
          </div>
        ) : openBOMItem ? (
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
              rowKey={(record) =>
                `${record.componentId?._id || "unknown"}-${record.percentage || 0}`
              }
              pagination={false}
              bordered
              size="small"
              scroll={{ x: "max-content" }}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}>
                      <Text strong>{t("totalCostLabel")}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <Text strong>₪{totalBOMCost.toFixed(2)}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </>
        ) : null}
      </Modal>
    </div>
  );
}
