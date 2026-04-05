"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Divider,
  Spin,
  Tag,
  Alert,
} from "antd";
import {
  ReloadOutlined,
  ShopOutlined,
  RiseOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import { useTranslations } from "next-intl";
import dayjs, { Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const { Title, Text } = Typography;

const SUPPLIER_COLORS = [
  "#1677ff",
  "#52c41a",
  "#fa8c16",
  "#722ed1",
  "#eb2f96",
  "#13c2c2",
  "#f5222d",
  "#a0d911",
  "#096dd9",
  "#d46b08",
  "#08979c",
  "#c41d7f",
];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type MonthlyMap = Record<string, number>;

interface SupplierData {
  name: string;
  monthly: MonthlyMap;
  total: number;
}

interface ReportData {
  year: number;
  months: string[];
  suppliers: SupplierData[];
  purchaseTotals: MonthlyMap;
  purchaseGrandTotal: number;
  income: MonthlyMap;
}

export default function SupplierReportPage() {
  const goUp = useNavigateUp();
  const t = useTranslations("manager.supplierReport");
  const { theme } = useTheme();
  const [selectedYear, setSelectedYear] = useState<Dayjs>(dayjs());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (year: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/manager/supplier-report?year=${year}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch supplier report");
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedYear.year());
  }, [selectedYear, fetchReport]);

  const isDark = theme === "dark";
  const gridColor = isDark ? "#374151" : "#e5e7eb";
  const axisColor = isDark ? "#9ca3af" : "#6b7280";
  const tooltipBg = isDark ? "#1f2937" : "#ffffff";
  const tooltipBorder = isDark ? "#374151" : "#e5e7eb";

  // ── Chart data ────────────────────────────────────────────────────

  const lineChartData =
    data?.months.map((month, i) => {
      const entry: Record<string, any> = { month: SHORT_MONTHS[i] };
      data.suppliers.forEach((s) => {
        entry[s.name] = Math.round((s.monthly[month] || 0) * 100) / 100;
      });
      return entry;
    }) ?? [];

  const barChartData =
    data?.months.map((month, i) => ({
      month: SHORT_MONTHS[i],
      rawMaterial: Math.round(data.purchaseTotals[month] || 0),
      income: Math.round(data.income[month] || 0),
    })) ?? [];

  // ── Table setup ────────────────────────────────────────────────────

  const tableColumns: ColumnsType<any> = [
    {
      title: t("supplier"),
      dataIndex: "name",
      key: "name",
      fixed: "left",
      width: 160,
      render: (name: string, record: any) =>
        record.isTotal ? <Text strong>{name}</Text> : <Text>{name}</Text>,
    },
    ...(data?.months ?? []).map((month, i) => ({
      title: SHORT_MONTHS[i],
      dataIndex: month,
      key: month,
      align: "right" as const,
      width: 85,
      render: (val: number, record: any) => {
        const amount = val || 0;
        if (!amount) return <Text type="secondary">—</Text>;
        return record.isTotal ? (
          <Text strong style={{ color: "#1677ff" }}>
            ₪{amount.toLocaleString()}
          </Text>
        ) : (
          <Text>₪{amount.toLocaleString()}</Text>
        );
      },
    })),
    {
      title: t("total"),
      dataIndex: "total",
      key: "total",
      align: "right" as const,
      fixed: "right",
      width: 120,
      render: (val: number, record: any) => (
        <Tag color={record.isTotal ? "blue" : "default"}>
          ₪{(val || 0).toLocaleString()}
        </Tag>
      ),
    },
  ];

  const tableData = [
    ...(data?.suppliers ?? []).map((s) => {
      const row: Record<string, any> = {
        key: s.name,
        name: s.name,
        total: Math.round(s.total),
      };
      data!.months.forEach((m) => {
        row[m] = Math.round(s.monthly[m] || 0);
      });
      return row;
    }),
    ...(data
      ? [
          {
            key: "__total__",
            name: t("totalRow"),
            total: Math.round(data.purchaseGrandTotal),
            isTotal: true,
            ...Object.fromEntries(
              data.months.map((m) => [m, Math.round(data.purchaseTotals[m] || 0)])
            ),
          },
        ]
      : []),
  ];

  // ── Summary stats ──────────────────────────────────────────────────

  const totalIncome = data
    ? Object.values(data.income).reduce((a, b) => a + b, 0)
    : 0;
  const rawRatio =
    totalIncome > 0 && data ? (data.purchaseGrandTotal / totalIncome) * 100 : 0;

  return (
    <div
      style={{
        padding: "32px 24px",
        background: isDark ? "#1f1f1f" : "#ffffff",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>

          {/* ── Header ────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <BackButton onClick={goUp} size="large" style={{ minWidth: 100 }}>
              {t("back")}
            </BackButton>
            <Title level={2} style={{ margin: 0 }}>
              {t("pageTitle")}
            </Title>
            <Space size="middle" wrap>
              <DatePicker
                picker="year"
                value={selectedYear}
                onChange={(d) => d && setSelectedYear(d)}
                allowClear={false}
                size="large"
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchReport(selectedYear.year())}
                loading={loading}
                size="large"
              >
                {t("refresh")}
              </Button>
            </Space>
          </div>

          <Divider style={{ margin: "8px 0" }} />

          {error && (
            <Alert
              type="error"
              message={t("fetchError")}
              description={error}
              showIcon
            />
          )}

          <Spin
            spinning={loading}
            indicator={
              <LoadingOutlined
                style={{ fontSize: 40, color: isDark ? "#fff" : undefined }}
                spin
              />
            }
          >
            {data && (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>

                {/* ── KPI Cards ─────────────────────────────────── */}
                <Row gutter={[24, 24]}>
                  <Col xs={24} sm={8}>
                    <Card
                      bordered={false}
                      style={{
                        background:
                          "linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)",
                        borderRadius: 12,
                        boxShadow: "0 2px 8px rgba(255,77,79,0.15)",
                      }}
                    >
                      <Statistic
                        title={
                          <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.72)" }}>
                            {t("totalPurchases")}
                          </span>
                        }
                        value={data.purchaseGrandTotal}
                        precision={2}
                        prefix={<ShopOutlined style={{ fontSize: 18 }} />}
                        suffix="₪"
                        valueStyle={{ color: "#cf1322", fontWeight: 600, fontSize: 22 }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card
                      bordered={false}
                      style={{
                        background:
                          "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)",
                        borderRadius: 12,
                        boxShadow: "0 2px 8px rgba(82,196,26,0.15)",
                      }}
                    >
                      <Statistic
                        title={
                          <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.72)" }}>
                            {t("totalIncome")}
                          </span>
                        }
                        value={totalIncome}
                        precision={2}
                        prefix={<RiseOutlined style={{ fontSize: 18 }} />}
                        suffix="₪"
                        valueStyle={{ color: "#389e0d", fontWeight: 600, fontSize: 22 }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card
                      bordered={false}
                      style={{
                        background:
                          rawRatio > 60
                            ? "linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)"
                            : "linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)",
                        borderRadius: 12,
                        boxShadow:
                          rawRatio > 60
                            ? "0 2px 8px rgba(255,77,79,0.15)"
                            : "0 2px 8px rgba(22,119,255,0.15)",
                      }}
                    >
                      <Statistic
                        title={
                          <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.72)" }}>
                            {t("rawMaterialRatio")}
                          </span>
                        }
                        value={rawRatio}
                        precision={1}
                        suffix="%"
                        valueStyle={{
                          color: rawRatio > 60 ? "#cf1322" : "#0958d9",
                          fontWeight: 600,
                          fontSize: 22,
                        }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* ── Supplier Line Chart ────────────────────────── */}
                {data.suppliers.length > 0 && (
                  <Card
                    title={
                      <Title level={4} style={{ margin: 0 }}>
                        {t("supplierChartTitle")}
                      </Title>
                    }
                    style={{ borderRadius: 12 }}
                  >
                    <div style={{ height: 360 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={lineChartData}
                          margin={{ top: 8, right: 32, left: 8, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis
                            dataKey="month"
                            stroke={axisColor}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            stroke={axisColor}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(v) =>
                              v >= 1000 ? `₪${(v / 1000).toFixed(0)}k` : `₪${v}`
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              background: tooltipBg,
                              border: `1px solid ${tooltipBorder}`,
                              borderRadius: 8,
                            }}
                            formatter={(val, name) => [
                              `₪${Number(val).toLocaleString()}`,
                              name,
                            ]}
                          />
                          <Legend />
                          {data.suppliers.map((s, i) => (
                            <Line
                              key={s.name}
                              type="monotone"
                              dataKey={s.name}
                              stroke={SUPPLIER_COLORS[i % SUPPLIER_COLORS.length]}
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              activeDot={{ r: 6 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {/* ── Supplier Table ─────────────────────────────── */}
                <Card
                  title={
                    <Title level={4} style={{ margin: 0 }}>
                      {t("supplierTableTitle")}
                    </Title>
                  }
                  style={{ borderRadius: 12 }}
                >
                  <Table
                    columns={tableColumns}
                    dataSource={tableData}
                    pagination={false}
                    scroll={{ x: "max-content" }}
                    size="small"
                    bordered
                    rowClassName={(record) =>
                      record.isTotal
                        ? "ant-table-row-selected"
                        : ""
                    }
                  />
                </Card>

                {/* ── Raw Material vs Income Bar Chart ──────────── */}
                <Card
                  title={
                    <Title level={4} style={{ margin: 0 }}>
                      {t("comparisonChartTitle")}
                    </Title>
                  }
                  extra={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t("incomeNote")}
                    </Text>
                  }
                  style={{ borderRadius: 12 }}
                >
                  <div style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barChartData}
                        margin={{ top: 8, right: 32, left: 8, bottom: 0 }}
                        barSize={28}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          dataKey="month"
                          stroke={axisColor}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          stroke={axisColor}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(v) =>
                            v >= 1000 ? `₪${(v / 1000).toFixed(0)}k` : `₪${v}`
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            background: tooltipBg,
                            border: `1px solid ${tooltipBorder}`,
                            borderRadius: 8,
                          }}
                          formatter={(val, name) => [
                            `₪${Number(val).toLocaleString()}`,
                            name,
                          ]}
                        />
                        <Legend />
                        <Bar
                          dataKey="rawMaterial"
                          name={t("rawMaterialLabel")}
                          fill="#ff4d4f"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="income"
                          name={t("incomeLabel")}
                          fill="#52c41a"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {data.suppliers.length === 0 && (
                  <Alert
                    type="info"
                    message={t("noData")}
                    showIcon
                    style={{ borderRadius: 8 }}
                  />
                )}
              </Space>
            )}
          </Spin>
        </Space>
      </div>
    </div>
  );
}
