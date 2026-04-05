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
  Tooltip,
} from "antd";
import {
  ReloadOutlined,
  LoadingOutlined,
  DiffOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import { useTranslations } from "next-intl";
import dayjs, { Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface DiffItem {
  _id: string;
  itemName: string;
  sku: string;
  category: string;
  unit: string;
  estimatedCost: number;
  actualUsedCost: number;
  difference: number;
  variancePct: number | null;
  openingCost: number;
  purchasedCost: number;
  closingCost: number;
}

interface Summary {
  totalEstimated: number;
  totalActual: number;
  totalDifference: number;
  variancePct: number;
  itemCount: number;
  taskCount: number;
}

interface ReportData {
  period: { startDate: string; endDate: string };
  summary: Summary;
  items: DiffItem[];
}

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

const fmt = (n: number) =>
  "₪" +
  n.toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function FoodCostDiffPage() {
  const goUp = useNavigateUp();
  const t = useTranslations("manager.foodCostDiff");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(
    async (range: [Dayjs, Dayjs]) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          startDate: range[0].format("YYYY-MM-DD"),
          endDate: range[1].format("YYYY-MM-DD"),
        });
        const res = await fetch(`/api/manager/food-cost-diff?${params}`);
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
    fetchReport(range);
  };

  const cardStyle = {
    borderRadius: 12,
    background: isDark ? "#141414" : "#fff",
    border: `1px solid ${isDark ? "#303030" : "#f0f0f0"}`,
  };

  const textColor = isDark ? "#fff" : "#000";
  const subColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

  const diffColor = (diff: number) => {
    if (diff > 0) return "#cf1322"; // over — red
    if (diff < 0) return "#389e0d"; // under — green
    return isDark ? "#aaa" : "#666";
  };

  // Top 10 items for chart
  const chartData = data
    ? [...data.items]
        .sort((a, b) => b.estimatedCost - a.estimatedCost)
        .slice(0, 10)
        .map((item) => ({
          name:
            item.itemName.length > 16
              ? item.itemName.slice(0, 16) + "…"
              : item.itemName,
          [t("colEstimated")]: item.estimatedCost,
          [t("colActual")]: item.actualUsedCost,
        }))
    : [];

  const columns: ColumnsType<DiffItem> = [
    {
      title: t("colItem"),
      key: "item",
      fixed: "left",
      width: 200,
      render: (_: any, row: DiffItem) => (
        <div>
          <Text strong style={{ color: textColor }}>
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
      width: 150,
      render: (cat: string) => (
        <Tag color={CATEGORY_COLORS[cat] ?? "default"} style={{ fontSize: 11 }}>
          {t(`cat_${cat}` as any)}
        </Tag>
      ),
    },
    {
      title: (
        <Tooltip title={t("estimatedTooltip")}>
          {t("colEstimated")} <InfoCircleOutlined />
        </Tooltip>
      ),
      dataIndex: "estimatedCost",
      key: "estimatedCost",
      align: "right",
      width: 150,
      sorter: (a, b) => a.estimatedCost - b.estimatedCost,
      render: (v: number) => (
        <Text style={{ color: "#1677ff" }}>{fmt(v)}</Text>
      ),
    },
    {
      title: (
        <Tooltip title={t("actualTooltip")}>
          {t("colActual")} <InfoCircleOutlined />
        </Tooltip>
      ),
      key: "actualUsedCost",
      align: "right",
      width: 200,
      sorter: (a: DiffItem, b: DiffItem) => a.actualUsedCost - b.actualUsedCost,
      render: (_: any, row: DiffItem) => (
        <Tooltip
          title={
            <div style={{ fontSize: 12 }}>
              <div>
                {t("opening")}: {fmt(row.openingCost)}
              </div>
              <div>
                {t("purchases")}: {fmt(row.purchasedCost)}
              </div>
              <div>
                {t("closing")}: {fmt(row.closingCost)}
              </div>
            </div>
          }
        >
          <Text style={{ color: "#52c41a", cursor: "help" }}>
            {fmt(row.actualUsedCost)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: t("colDifference"),
      dataIndex: "difference",
      key: "difference",
      align: "right",
      width: 150,
      sorter: (a, b) => a.difference - b.difference,
      defaultSortOrder: "descend",
      render: (diff: number) => (
        <Space size={4}>
          {diff > 0 ? (
            <RiseOutlined style={{ color: "#cf1322" }} />
          ) : diff < 0 ? (
            <FallOutlined style={{ color: "#389e0d" }} />
          ) : null}
          <Text strong style={{ color: diffColor(diff) }}>
            {diff > 0 ? "+" : ""}
            {fmt(diff)}
          </Text>
        </Space>
      ),
    },
    {
      title: t("colVariance"),
      dataIndex: "variancePct",
      key: "variancePct",
      align: "right",
      width: 110,
      sorter: (a, b) => (a.variancePct ?? 0) - (b.variancePct ?? 0),
      render: (pct: number | null) => {
        if (pct === null)
          return <Text type="secondary">—</Text>;
        return (
          <Text strong style={{ color: diffColor(pct) }}>
            {pct > 0 ? "+" : ""}
            {pct.toLocaleString("he-IL", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            %
          </Text>
        );
      },
    },
  ];

  const summary = data?.summary;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: isDark ? "#0f0f0f" : "#f5f5f5",
        padding: "clamp(10px, 3vw, 24px)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <BackButton onClick={goUp}>{t("back")}</BackButton>
        </div>

        {/* Header */}
        <Card
          style={{
            ...cardStyle,
            marginBottom: 20,
            background: isDark
              ? "linear-gradient(135deg,#1d1d1d,#141414)"
              : "linear-gradient(135deg,#fff7e6,#fff2e8)",
            borderColor: isDark ? "#d4380d44" : "#ffbb96",
          }}
        >
          <Space align="start">
            <DiffOutlined
              style={{ fontSize: 32, color: "#fa541c", marginTop: 4 }}
            />
            <div>
              <Title
                level={3}
                style={{ margin: 0, color: isDark ? "#fff" : "#000" }}
              >
                {t("pageTitle")}
              </Title>
              <Text style={{ color: subColor }}>{t("pageDescription")}</Text>
            </div>
          </Space>
        </Card>

        {/* Formula banner */}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
          message={
            <Space wrap>
              <Text strong>{t("formulaLabel")}</Text>
              <Text code>{t("formulaText")}</Text>
            </Space>
          }
        />

        {/* Date controls */}
        <Card style={{ ...cardStyle, marginBottom: 20 }}>
          <Space wrap>
            <RangePicker
              value={dateRange}
              onChange={(v) => {
                if (v?.[0] && v?.[1])
                  setDateRange([v[0] as Dayjs, v[1] as Dayjs]);
              }}
            />
            {(["today", "week", "month", "lastMonth"] as const).map((p) => (
              <Button key={p} size="small" onClick={() => handlePreset(p)}>
                {t(p)}
              </Button>
            ))}
            <Button
              type="primary"
              icon={loading ? <LoadingOutlined /> : <ReloadOutlined />}
              onClick={() => fetchReport(dateRange)}
              disabled={loading}
            >
              {t("generate")}
            </Button>
          </Space>
        </Card>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        <Spin spinning={loading} indicator={<LoadingOutlined />}>
          {summary && (
            <>
              {/* KPI Cards */}
              <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={12} sm={12} lg={6}>
                  <Card style={cardStyle}>
                    <Statistic
                      title={
                        <Text style={{ color: subColor }}>
                          {t("kpiEstimated")}
                        </Text>
                      }
                      value={summary.totalEstimated}
                      prefix="₪"
                      precision={2}
                      valueStyle={{ color: "#1677ff" }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={12} lg={6}>
                  <Card style={cardStyle}>
                    <Statistic
                      title={
                        <Text style={{ color: subColor }}>
                          {t("kpiActual")}
                        </Text>
                      }
                      value={summary.totalActual}
                      prefix="₪"
                      precision={2}
                      valueStyle={{ color: "#52c41a" }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={12} lg={6}>
                  <Card style={cardStyle}>
                    <Statistic
                      title={
                        <Text style={{ color: subColor }}>
                          {t("kpiDifference")}
                        </Text>
                      }
                      value={Math.abs(summary.totalDifference)}
                      prefix={summary.totalDifference >= 0 ? "+₪" : "-₪"}
                      precision={2}
                      valueStyle={{
                        color: diffColor(summary.totalDifference),
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {summary.totalDifference > 0
                        ? t("overBudget")
                        : summary.totalDifference < 0
                        ? t("underBudget")
                        : t("onTarget")}
                    </Text>
                  </Card>
                </Col>
                <Col xs={12} sm={12} lg={6}>
                  <Card style={cardStyle}>
                    <Statistic
                      title={
                        <Text style={{ color: subColor }}>
                          {t("kpiVariance")}
                        </Text>
                      }
                      value={Math.abs(summary.variancePct)}
                      suffix="%"
                      precision={1}
                      valueStyle={{
                        color: diffColor(summary.variancePct),
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t("basedOnTasks", { count: summary.taskCount })}
                    </Text>
                  </Card>
                </Col>
              </Row>

              {/* Bar Chart */}
              {chartData.length > 0 && (
                <Card
                  style={{ ...cardStyle, marginBottom: 20 }}
                  title={
                    <Text strong style={{ color: textColor }}>
                      {t("chartTitle")}
                    </Text>
                  }
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "#303030" : "#f0f0f0"}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: isDark ? "#aaa" : "#666" }}
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          "₪" +
                          v.toLocaleString("he-IL", {
                            maximumFractionDigits: 0,
                          })
                        }
                        tick={{ fontSize: 11, fill: isDark ? "#aaa" : "#666" }}
                      />
                      <RechartsTooltip
                        formatter={(value: any) => fmt(Number(value))}
                        contentStyle={{
                          background: isDark ? "#1f1f1f" : "#fff",
                          border: `1px solid ${isDark ? "#303030" : "#f0f0f0"}`,
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey={t("colEstimated")}
                        fill="#1677ff"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey={t("colActual")}
                        fill="#52c41a"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Table */}
              <Card
                style={cardStyle}
                title={
                  <Text strong style={{ color: textColor }}>
                    {t("tableTitle")} ({summary.itemCount})
                  </Text>
                }
              >
                <Table
                  dataSource={data?.items ?? []}
                  columns={columns}
                  rowKey="_id"
                  size="small"
                  scroll={{ x: 960 }}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  rowClassName={(row) =>
                    row.variancePct !== null && Math.abs(row.variancePct) > 20
                      ? "high-variance-row"
                      : ""
                  }
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row
                        style={{
                          background: isDark ? "#1a1a1a" : "#fafafa",
                          fontWeight: 700,
                        }}
                      >
                        <Table.Summary.Cell index={0} colSpan={2}>
                          <Text strong style={{ color: textColor }}>
                            {t("total")}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                          <Text strong style={{ color: "#1677ff" }}>
                            {fmt(summary.totalEstimated)}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right">
                          <Text strong style={{ color: "#52c41a" }}>
                            {fmt(summary.totalActual)}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right">
                          <Text
                            strong
                            style={{ color: diffColor(summary.totalDifference) }}
                          >
                            {summary.totalDifference > 0 ? "+" : ""}
                            {fmt(summary.totalDifference)}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right">
                          <Text
                            strong
                            style={{ color: diffColor(summary.variancePct) }}
                          >
                            {summary.variancePct > 0 ? "+" : ""}
                            {summary.variancePct.toLocaleString("he-IL", {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                            %
                          </Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </Card>
            </>
          )}

          {!summary && !loading && !error && (
            <Card style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
              <DiffOutlined
                style={{ fontSize: 48, color: "#fa541c", opacity: 0.4 }}
              />
              <br />
              <Text type="secondary" style={{ fontSize: 16, marginTop: 16 }}>
                {t("emptyState")}
              </Text>
            </Card>
          )}
        </Spin>
      </div>
    </div>
  );
}
