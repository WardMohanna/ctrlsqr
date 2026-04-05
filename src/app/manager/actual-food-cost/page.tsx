"use client";

import React, { useState, useCallback } from "react";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTheme } from "@/hooks/useTheme";
import {
  Card,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  Table,
  Typography,
  Spin,
  Tag,
  Alert,
  Checkbox,
  Divider,
  Tooltip,
} from "antd";
import {
  ReloadOutlined,
  LoadingOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import { useTranslations } from "next-intl";
import dayjs, { Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const ALL_CATEGORIES = [
  "ProductionRawMaterial",
  "CoffeeshopRawMaterial",
  "WorkShopRawMaterial",
  "CleaningMaterial",
  "Packaging",
  "DisposableEquipment",
  "FinalProduct",
  "SemiFinalProduct",
] as const;

type Category = (typeof ALL_CATEGORIES)[number];

const DEFAULT_CATEGORIES: Category[] = [
  "ProductionRawMaterial",
  "CoffeeshopRawMaterial",
  "Packaging",
];

interface ItemRow {
  _id: string;
  itemName: string;
  sku: string;
  category: string;
  unit: string;
  currentCostPrice: number;
  openingQty: number;
  purchasedQty: number;
  closingQty: number;
  usedQty: number;
  openingCost: number;
  purchasedCost: number;
  closingCost: number;
  usedCost: number;
}

interface Summary {
  totalOpeningCost: number;
  totalPurchasedCost: number;
  totalClosingCost: number;
  totalUsedCost: number;
  itemCount: number;
}

interface ReportData {
  period: { startDate: string; endDate: string };
  summary: Summary;
  items: ItemRow[];
}

const fmt = (n: number) =>
  "₪" +
  n.toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtQty = (n: number, unit: string) =>
  `${n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ${unit}`;

const CATEGORY_COLORS: Record<string, string> = {
  ProductionRawMaterial: "blue",
  CoffeeshopRawMaterial: "cyan",
  WorkShopRawMaterial: "purple",
  CleaningMaterial: "orange",
  Packaging: "green",
  DisposableEquipment: "magenta",
  FinalProduct: "gold",
  SemiFinalProduct: "lime",
};

export default function ActualFoodCostPage() {
  const goUp = useNavigateUp();
  const t = useTranslations("manager.actualFoodCost");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(
    async (range: [Dayjs, Dayjs], cats: Category[]) => {
      if (cats.length === 0) {
        setError(t("noCategorySelected"));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          startDate: range[0].format("YYYY-MM-DD"),
          endDate: range[1].format("YYYY-MM-DD"),
          categories: cats.join(","),
        });
        const res = await fetch(`/api/manager/actual-food-cost?${params}`);
        if (!res.ok) throw new Error("fetch_error");
        setData(await res.json());
      } catch {
        setError(t("fetchError"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  const handlePreset = (preset: "today" | "week" | "month" | "lastMonth") => {
    let range: [Dayjs, Dayjs];
    if (preset === "today") {
      range = [dayjs(), dayjs()];
    } else if (preset === "week") {
      range = [dayjs().startOf("week"), dayjs().endOf("week")];
    } else if (preset === "month") {
      range = [dayjs().startOf("month"), dayjs().endOf("month")];
    } else {
      range = [
        dayjs().subtract(1, "month").startOf("month"),
        dayjs().subtract(1, "month").endOf("month"),
      ];
    }
    setDateRange(range);
    fetchReport(range, categories);
  };

  const cardStyle = {
    borderRadius: 12,
    background: isDark ? "#141414" : "#fff",
    border: `1px solid ${isDark ? "#303030" : "#f0f0f0"}`,
  };

  const columns: ColumnsType<ItemRow> = [
    {
      title: t("colItem"),
      key: "item",
      fixed: "left",
      width: 200,
      render: (_: any, row: ItemRow) => (
        <div>
          <Text strong style={{ color: isDark ? "#fff" : "#000" }}>
            {row.itemName}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {row.sku}
          </Text>
        </div>
      ),
    },
    {
      title: t("colCategory"),
      dataIndex: "category",
      key: "category",
      width: 160,
      render: (cat: string) => (
        <Tag color={CATEGORY_COLORS[cat] ?? "default"} style={{ fontSize: 11 }}>
          {t(`cat_${cat}` as any)}
        </Tag>
      ),
      filters: ALL_CATEGORIES.map((c) => ({
        text: t(`cat_${c}` as any),
        value: c,
      })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: t("colUnit"),
      dataIndex: "unit",
      key: "unit",
      width: 70,
      align: "center",
    },
    {
      title: (
        <Tooltip title={t("openingTooltip")}>
          {t("colOpening")} <InfoCircleOutlined />
        </Tooltip>
      ),
      key: "opening",
      align: "right",
      width: 160,
      render: (_: any, row: ItemRow) => (
        <div>
          <Text>{fmtQty(row.openingQty, row.unit)}</Text>
          <br />
          <Text style={{ color: "#1677ff", fontSize: 12 }}>
            {fmt(row.openingCost)}
          </Text>
        </div>
      ),
    },
    {
      title: (
        <Tooltip title={t("purchasedTooltip")}>
          {t("colPurchased")} <InfoCircleOutlined />
        </Tooltip>
      ),
      key: "purchased",
      align: "right",
      width: 160,
      render: (_: any, row: ItemRow) => (
        <div>
          <Text>{fmtQty(row.purchasedQty, row.unit)}</Text>
          <br />
          <Text style={{ color: "#52c41a", fontSize: 12 }}>
            {fmt(row.purchasedCost)}
          </Text>
        </div>
      ),
    },
    {
      title: (
        <Tooltip title={t("closingTooltip")}>
          {t("colClosing")} <InfoCircleOutlined />
        </Tooltip>
      ),
      key: "closing",
      align: "right",
      width: 160,
      render: (_: any, row: ItemRow) => (
        <div>
          <Text>{fmtQty(row.closingQty, row.unit)}</Text>
          <br />
            <Text style={{ color: "#fa8c16", fontSize: 12 }}>
            {fmt(row.closingCost)}
          </Text>
        </div>
      ),
    },
    {
      title: t("colUsed"),
      key: "used",
      align: "right",
      width: 180,
      defaultSortOrder: "descend",
      sorter: (a, b) => a.usedCost - b.usedCost,
      render: (_: any, row: ItemRow) => (
        <div>
          <Text strong style={{ color: row.usedQty < 0 ? "#faad14" : isDark ? "#fff" : "#000" }}>
            {fmtQty(row.usedQty, row.unit)}
          </Text>
          <br />
          <Text
            strong
            style={{
              color: row.usedCost < 0 ? "#faad14" : "#f5222d",
              fontSize: 13,
            }}
          >
            {fmt(row.usedCost)}
          </Text>
        </div>
      ),
    },
    {
      title: t("colUnitCost"),
      dataIndex: "currentCostPrice",
      key: "currentCostPrice",
      align: "right",
      width: 110,
      render: (v: number) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {fmt(v)}
        </Text>
      ),
    },
  ];

  const summary = data?.summary;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: isDark ? "#1f1f1f" : "#f5f5f5",
        padding: "clamp(10px, 3.5vw, 24px)",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <BackButton onClick={goUp}>{t("back")}</BackButton>
          <Divider type="vertical" />
          <DatabaseOutlined style={{ fontSize: 26, color: "#13c2c2" }} />
          <Title level={3} style={{ margin: 0, color: isDark ? "#fff" : "#000" }}>
            {t("pageTitle")}
          </Title>
        </div>

        {/* Formula Banner */}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20, borderRadius: 10 }}
          message={
            <Text>
              <Text strong>{t("formulaLabel")}: </Text>
              <Text code>{t("formula")}</Text>
            </Text>
          }
        />

        {/* Controls */}
        <Card style={{ ...cardStyle, marginBottom: 20 }}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {/* Date presets */}
            <Space wrap>
              <Button size="small" onClick={() => handlePreset("today")}>
                {t("presetToday")}
              </Button>
              <Button size="small" onClick={() => handlePreset("week")}>
                {t("presetThisWeek")}
              </Button>
              <Button size="small" onClick={() => handlePreset("month")}>
                {t("presetThisMonth")}
              </Button>
              <Button size="small" onClick={() => handlePreset("lastMonth")}>
                {t("presetLastMonth")}
              </Button>
            </Space>

            {/* Date range + Run */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <RangePicker
                value={dateRange}
                onChange={(v) => {
                  if (v?.[0] && v[1])
                    setDateRange([v[0] as Dayjs, v[1] as Dayjs]);
                }}
                allowClear={false}
              />
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={() => fetchReport(dateRange, categories)}
                style={{ background: "#13c2c2", borderColor: "#13c2c2" }}
              >
                {t("runReport")}
              </Button>
            </div>

            {/* Category filter */}
            <div>
              <Text
                strong
                style={{ color: isDark ? "#fff" : "#000", marginBottom: 8, display: "block" }}
              >
                {t("filterCategories")}:
              </Text>
              <Checkbox.Group
                value={categories}
                onChange={(vals) => setCategories(vals as Category[])}
              >
                <Space wrap>
                  {ALL_CATEGORIES.map((cat) => (
                    <Checkbox key={cat} value={cat}>
                      <Tag color={CATEGORY_COLORS[cat]}>{t(`cat_${cat}` as any)}</Tag>
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </div>
          </Space>
        </Card>

        <Spin
          spinning={loading}
          indicator={
            <LoadingOutlined
              style={{ fontSize: 40, color: isDark ? "#fff" : "#13c2c2" }}
              spin
            />
          }
        >
          {error && (
            <Alert type="error" message={error} showIcon style={{ marginBottom: 20 }} />
          )}

          {data && (
            <>
              {/* KPI Cards */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card
                    style={{
                      ...cardStyle,
                      background: isDark ? "#111a2c" : "#e6f4ff",
                    }}
                  >
                    <Statistic
                      title={
                        <Text style={{ color: isDark ? "#69b1ff" : "#0958d9" }}>
                          {t("kpiOpening")}
                        </Text>
                      }
                      value={summary?.totalOpeningCost ?? 0}
                      precision={2}
                      prefix="₪"
                      valueStyle={{
                        color: "#1677ff",
                        fontSize: "clamp(16px,2.5vw,26px)",
                      }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card
                    style={{
                      ...cardStyle,
                      background: isDark ? "#162312" : "#f6ffed",
                    }}
                  >
                    <Statistic
                      title={
                        <Text style={{ color: isDark ? "#95de64" : "#237804" }}>
                          {t("kpiPurchased")}
                        </Text>
                      }
                      value={summary?.totalPurchasedCost ?? 0}
                      precision={2}
                      prefix="₪"
                      valueStyle={{
                        color: "#52c41a",
                        fontSize: "clamp(16px,2.5vw,26px)",
                      }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card
                    style={{
                      ...cardStyle,
                      background: isDark ? "#1c1410" : "#fff7e6",
                    }}
                  >
                    <Statistic
                      title={
                        <Text style={{ color: isDark ? "#ffc069" : "#ad4e00" }}>
                          {t("kpiClosing")}
                        </Text>
                      }
                      value={summary?.totalClosingCost ?? 0}
                      precision={2}
                      prefix="₪"
                      valueStyle={{
                        color: "#fa8c16",
                        fontSize: "clamp(16px,2.5vw,26px)",
                      }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card
                    style={{
                      ...cardStyle,
                      background: isDark ? "#2a1215" : "#fff1f0",
                    }}
                  >
                    <Statistic
                      title={
                        <Text style={{ color: isDark ? "#ff7875" : "#cf1322" }}>
                          {t("kpiTotalCOGS")}
                        </Text>
                      }
                      value={summary?.totalUsedCost ?? 0}
                      precision={2}
                      prefix="₪"
                      valueStyle={{
                        color: "#f5222d",
                        fontSize: "clamp(16px,2.5vw,26px)",
                        fontWeight: 700,
                      }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Table */}
              {data.items.length > 0 ? (
                <Card style={cardStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <Title
                      level={5}
                      style={{ margin: 0, color: isDark ? "#fff" : "#000" }}
                    >
                      <DatabaseOutlined
                        style={{ marginInlineEnd: 8, color: "#13c2c2" }}
                      />
                      {t("tableTitle")}
                    </Title>
                    <Text type="secondary">
                      {t("itemCount", { count: data.items.length })}
                    </Text>
                  </div>

                  <Table<ItemRow>
                    columns={columns}
                    dataSource={data.items}
                    rowKey="_id"
                    size="middle"
                    scroll={{ x: 1100 }}
                    pagination={{ pageSize: 50, showSizeChanger: true }}
                    rowClassName={(row) =>
                      row.usedCost < 0 ? "ant-table-row-warning" : ""
                    }
                    summary={() => (
                      <Table.Summary fixed>
                        <Table.Summary.Row
                          style={{
                            background: isDark ? "#1f1f1f" : "#fafafa",
                            fontWeight: 700,
                          }}
                        >
                          <Table.Summary.Cell index={0} colSpan={3}>
                            <Text strong>{t("totalRow")}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} />
                          <Table.Summary.Cell index={4} align="right">
                            <Text style={{ color: "#1677ff" }}>
                              {fmt(summary?.totalOpeningCost ?? 0)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">
                            <Text style={{ color: "#52c41a" }}>
                              {fmt(summary?.totalPurchasedCost ?? 0)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right">
                            <Text style={{ color: "#fa8c16" }}>
                              {fmt(summary?.totalClosingCost ?? 0)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={7} align="right">
                            <Text strong style={{ color: "#f5222d", fontSize: 14 }}>
                              {fmt(summary?.totalUsedCost ?? 0)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={8} />
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
                  />
                </Card>
              ) : (
                <Alert
                  type="info"
                  message={t("noData")}
                  showIcon
                  style={{ borderRadius: 10 }}
                />
              )}
            </>
          )}

          {!data && !loading && !error && (
            <Card style={cardStyle}>
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 24px",
                  color: isDark ? "#595959" : "#8c8c8c",
                }}
              >
                <DatabaseOutlined style={{ fontSize: 56, marginBottom: 16 }} />
                <div>{t("selectDateRange")}</div>
              </div>
            </Card>
          )}
        </Spin>
      </div>
    </div>
  );
}
