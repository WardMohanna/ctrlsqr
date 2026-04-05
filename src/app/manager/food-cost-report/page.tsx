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
  Radio,
  Divider,
} from "antd";
import {
  ReloadOutlined,
  LoadingOutlined,
  ExperimentOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
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
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type GroupBy = "day" | "week" | "month";

interface MaterialRow {
  materialId: string;
  materialName: string;
  usage: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

interface ProductRow {
  productId: string;
  productName: string;
  totalProduced: number;
  totalDefected: number;
  totalCost: number;
  costPerUnit: number;
  materials: MaterialRow[];
}

interface TimelineEntry {
  period: string;
  cost: number;
  produced: number;
}

interface ReportData {
  summary: {
    totalCost: number;
    totalProduced: number;
    totalDefected: number;
    taskCount: number;
  };
  timeline: TimelineEntry[];
  byProduct: ProductRow[];
}

const CHART_COLORS = ["#f5222d", "#fa541c", "#fa8c16", "#d4b106", "#52c41a"];

function pickColor(value: number, max: number): string {
  const idx = max > 0 ? Math.floor((value / max) * (CHART_COLORS.length - 1)) : 0;
  return CHART_COLORS[idx] ?? CHART_COLORS[0];
}

export default function FoodCostReportPage() {
  const goUp = useNavigateUp();
  const t = useTranslations("manager.foodCostReport");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs(),
  ]);
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(
    async (range: [Dayjs, Dayjs], gb: GroupBy) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          startDate: range[0].format("YYYY-MM-DD"),
          endDate: range[1].format("YYYY-MM-DD"),
          groupBy: gb,
        });
        const res = await fetch(`/api/manager/food-cost-report?${params}`);
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
    let gb: GroupBy = groupBy;
    if (preset === "today") {
      range = [dayjs(), dayjs()];
      gb = "day";
    } else if (preset === "week") {
      range = [dayjs().startOf("week"), dayjs().endOf("week")];
      gb = "day";
    } else if (preset === "month") {
      range = [dayjs().startOf("month"), dayjs()];
      gb = "day";
    } else {
      range = [
        dayjs().subtract(1, "month").startOf("month"),
        dayjs().subtract(1, "month").endOf("month"),
      ];
      gb = "day";
    }
    setDateRange(range);
    setGroupBy(gb);
    fetchReport(range, gb);
  };

  const maxCost =
    data?.timeline.length
      ? Math.max(...data.timeline.map((t) => t.cost))
      : 1;

  const cardStyle = {
    borderRadius: 12,
    background: isDark ? "#141414" : "#fff",
    border: `1px solid ${isDark ? "#303030" : "#f0f0f0"}`,
  };

  const sectionTitleStyle = {
    color: isDark ? "#fff" : "#000",
    marginBottom: 16,
  };

  // Product columns
  const productColumns: ColumnsType<ProductRow> = [
    {
      title: t("productName"),
      dataIndex: "productName",
      key: "productName",
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: t("produced"),
      dataIndex: "totalProduced",
      key: "totalProduced",
      align: "center",
      render: (v: number) => (
        <Tag color="green">{v.toLocaleString()}</Tag>
      ),
    },
    {
      title: t("defected"),
      dataIndex: "totalDefected",
      key: "totalDefected",
      align: "center",
      render: (v: number) => (
        <Tag color={v > 0 ? "orange" : "default"}>{v.toLocaleString()}</Tag>
      ),
    },
    {
      title: t("costPerUnit"),
      dataIndex: "costPerUnit",
      key: "costPerUnit",
      align: "right",
      render: (v: number) => (
        <Text>₪{v.toFixed(2)}</Text>
      ),
    },
    {
      title: t("totalCost"),
      dataIndex: "totalCost",
      key: "totalCost",
      align: "right",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.totalCost - b.totalCost,
      render: (v: number) => (
        <Text strong style={{ color: "#f5222d" }}>
          ₪{v.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
  ];

  // Material sub-table columns
  const materialColumns: ColumnsType<MaterialRow> = [
    {
      title: t("material"),
      dataIndex: "materialName",
      key: "materialName",
    },
    {
      title: t("usage"),
      key: "usage",
      align: "right",
      render: (_: any, row: MaterialRow) => `${row.usage.toFixed(3)} ${row.unit}`,
    },
    {
      title: t("unitCost"),
      dataIndex: "costPerUnit",
      key: "costPerUnit",
      align: "right",
      render: (v: number) => `₪${v.toFixed(4)}`,
    },
    {
      title: t("materialCost"),
      dataIndex: "totalCost",
      key: "totalCost",
      align: "right",
      render: (v: number) => (
        <Text style={{ color: "#fa541c" }}>
          ₪{v.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: isDark ? "#1f1f1f" : "#f5f5f5",
        padding: "clamp(10px, 3.5vw, 24px)",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Space align="center">
            <BackButton onClick={goUp}>{t("back")}</BackButton>
            <Divider type="vertical" />
            <ExperimentOutlined
              style={{ fontSize: 28, color: "#fa541c" }}
            />
            <Title level={3} style={{ margin: 0, color: isDark ? "#fff" : "#000" }}>
              {t("pageTitle")}
            </Title>
          </Space>
        </div>

        {/* Controls */}
        <Card style={{ ...cardStyle, marginBottom: 20 }}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {/* Presets */}
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

            {/* Date range + GroupBy + Fetch */}
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <RangePicker
                value={dateRange}
                onChange={(v) => {
                  if (v?.[0] && v[1])
                    setDateRange([v[0] as Dayjs, v[1] as Dayjs]);
                }}
                allowClear={false}
              />
              <Radio.Group
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="day">{t("groupByDay")}</Radio.Button>
                <Radio.Button value="week">{t("groupByWeek")}</Radio.Button>
                <Radio.Button value="month">{t("groupByMonth")}</Radio.Button>
              </Radio.Group>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={() => fetchReport(dateRange, groupBy)}
                style={{ background: "#fa541c", borderColor: "#fa541c" }}
              >
                {t("refresh")}
              </Button>
            </div>
          </Space>
        </Card>

        <Spin
          spinning={loading}
          indicator={
            <LoadingOutlined
              style={{ fontSize: 40, color: isDark ? "#fff" : "#fa541c" }}
              spin
            />
          }
        >
          {error && (
            <Alert
              type="error"
              message={error}
              showIcon
              style={{ marginBottom: 20 }}
            />
          )}

          {data && (
            <>
              {/* KPI Cards */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card style={{ ...cardStyle, background: isDark ? "#2a1215" : "#fff1f0" }}>
                    <Statistic
                      title={
                        <Text style={{ color: isDark ? "#ff7875" : "#cf1322" }}>
                          {t("totalCOGS")}
                        </Text>
                      }
                      value={data.summary.totalCost}
                      precision={2}
                      prefix="₪"
                      valueStyle={{ color: "#f5222d", fontSize: "clamp(18px,3vw,28px)" }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card style={{ ...cardStyle, background: isDark ? "#162312" : "#f6ffed" }}>
                    <Statistic
                      title={
                        <Text style={{ color: isDark ? "#95de64" : "#237804" }}>
                          {t("totalProduced")}
                        </Text>
                      }
                      value={data.summary.totalProduced}
                      suffix={<CheckCircleOutlined />}
                      valueStyle={{ color: "#52c41a", fontSize: "clamp(18px,3vw,28px)" }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card style={{ ...cardStyle, background: isDark ? "#1c1410" : "#fff7e6" }}>
                    <Statistic
                      title={
                        <Text style={{ color: isDark ? "#ffc069" : "#ad4e00" }}>
                          {t("cogsPerUnit")}
                        </Text>
                      }
                      value={
                        data.summary.totalProduced > 0
                          ? data.summary.totalCost / data.summary.totalProduced
                          : 0
                      }
                      precision={2}
                      prefix="₪"
                      valueStyle={{ color: "#fa8c16", fontSize: "clamp(18px,3vw,28px)" }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card style={{ ...cardStyle, background: isDark ? "#111a2c" : "#e6f4ff" }}>
                    <Statistic
                      title={
                        <Text style={{ color: isDark ? "#69b1ff" : "#0958d9" }}>
                          {t("totalTasks")}
                        </Text>
                      }
                      value={data.summary.taskCount}
                      suffix={<ThunderboltOutlined />}
                      valueStyle={{ color: "#1677ff", fontSize: "clamp(18px,3vw,28px)" }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* COGS Timeline Chart */}
              {data.timeline.length > 0 ? (
                <Card style={{ ...cardStyle, marginBottom: 24 }}>
                  <Title level={5} style={sectionTitleStyle}>
                    <ShoppingCartOutlined style={{ marginInlineEnd: 8, color: "#fa541c" }} />
                    {t("timelineTitle")}
                  </Title>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={data.timeline}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "#303030" : "#f0f0f0"}
                      />
                      <XAxis
                        dataKey="period"
                        tick={{ fill: isDark ? "#8c8c8c" : "#595959", fontSize: 11 }}
                      />
                      <YAxis
                        tickFormatter={(v) => `₪${v}`}
                        tick={{ fill: isDark ? "#8c8c8c" : "#595959", fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          `₪${value.toFixed(2)}`,
                          t("totalCOGS"),
                        ]}
                        contentStyle={{
                          background: isDark ? "#1f1f1f" : "#fff",
                          border: `1px solid ${isDark ? "#303030" : "#f0f0f0"}`,
                          borderRadius: 8,
                        }}
                        labelStyle={{ color: isDark ? "#fff" : "#000" }}
                      />
                      <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                        {data.timeline.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={pickColor(entry.cost, maxCost)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              ) : (
                <Alert
                  type="info"
                  message={t("noData")}
                  showIcon
                  style={{ marginBottom: 24 }}
                />
              )}

              {/* Product Breakdown Table */}
              {data.byProduct.length > 0 && (
                <Card style={cardStyle}>
                  <Title level={5} style={sectionTitleStyle}>
                    <ExperimentOutlined style={{ marginInlineEnd: 8, color: "#fa541c" }} />
                    {t("productBreakdownTitle")}
                  </Title>
                  <Table<ProductRow>
                    columns={productColumns}
                    dataSource={data.byProduct}
                    rowKey="productId"
                    size="middle"
                    pagination={{ pageSize: 20 }}
                    expandable={{
                      expandedRowRender: (record) =>
                        record.materials.length > 0 ? (
                          <Table<MaterialRow>
                            columns={materialColumns}
                            dataSource={record.materials}
                            rowKey="materialId"
                            size="small"
                            pagination={false}
                            style={{ margin: "8px 0" }}
                          />
                        ) : (
                          <Text type="secondary">—</Text>
                        ),
                      rowExpandable: (record) => record.materials.length > 0,
                    }}
                    footer={() => (
                      <Text type="secondary">
                        {t("totalItems", { total: data.byProduct.length })}
                      </Text>
                    )}
                  />
                </Card>
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
                <ExperimentOutlined style={{ fontSize: 56, marginBottom: 16 }} />
                <div>{t("selectDateRange")}</div>
              </div>
            </Card>
          )}
        </Spin>
      </div>
    </div>
  );
}
