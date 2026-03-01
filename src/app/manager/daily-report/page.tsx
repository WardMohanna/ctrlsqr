"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  DatePicker,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  Table,
  Typography,
  Divider,
  message,
  Collapse,
  Tag,
  Skeleton,
  Spin,
} from "antd";
import {
  DollarOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  ExperimentOutlined,
  LoadingOutlined,
  SaveOutlined,
  CloudOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { useTranslations } from "next-intl";

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface MaterialUsed {
  materialName: string;
  quantityUsed: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

interface ProductProduced {
  productName: string;
  quantityProduced: number;
  quantityDefected: number;
  materialsUsed: MaterialUsed[];
  totalMaterialCost: number;
  productValue: number;
  grossProfit: number;
  grossProfitPercentage: number;
}

interface DailyReport {
  date: string;
  productsProduced: ProductProduced[];
  totalMaterialCost: number;
  totalProductValue: number;
  totalGrossProfit: number;
  overallGrossProfitPercentage: number;
  source?: "saved" | "live";
  generatedAt?: string;
}

export default function DailyReportPage() {
  const router = useRouter();
  const t = useTranslations("manager.dailyReport");
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchReport = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/daily-report?date=${date}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Daily report API error:", res.status, errorData);
        throw new Error(errorData?.error || "Failed to fetch report");
      }
      const data = await res.json();
      setReport(data);
    } catch (error: any) {
      console.error("Error fetching report:", error);
      messageApi.error(`${t("errorLoading")}: ${error?.message || ""}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedDate.format("YYYY-MM-DD"));
  }, [selectedDate]);

  const handleDateChange = (date: Dayjs | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleGenerateReport = async () => {
    const date = selectedDate.format("YYYY-MM-DD");
    setGenerating(true);
    try {
      const res = await fetch("/api/manager/daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to generate report");
      }
      const data = await res.json();
      setReport(data.report);
      messageApi.success(t("reportSaved"));
    } catch (error: any) {
      console.error("Error generating report:", error);
      messageApi.error(`${t("errorGenerating")}: ${error?.message || ""}`);
    } finally {
      setGenerating(false);
    }
  };

  const materialColumns: ColumnsType<MaterialUsed> = [
    {
      title: t("material"),
      dataIndex: "materialName",
      key: "materialName",
    },
    {
      title: t("quantityUsed"),
      key: "quantity",
      align: "right",
      render: (_, record) => `${record.quantityUsed.toFixed(2)} ${record.unit}`,
    },
    {
      title: t("costPerUnit"),
      dataIndex: "costPerUnit",
      key: "costPerUnit",
      align: "right",
      render: (cost: number) => `₪${cost.toFixed(2)}`,
    },
    {
      title: t("totalCost"),
      dataIndex: "totalCost",
      key: "totalCost",
      align: "right",
      render: (cost: number) => <Tag color="red">₪{cost.toFixed(2)}</Tag>,
    },
  ];

  const productColumns: ColumnsType<ProductProduced> = [
    {
      title: t("productName"),
      dataIndex: "productName",
      key: "productName",
      width: 200,
    },
    {
      title: t("produced"),
      dataIndex: "quantityProduced",
      key: "quantityProduced",
      align: "center",
      width: 100,
      render: (qty: number) => <Tag color="green">{qty}</Tag>,
    },
    {
      title: t("quantityDefected"),
      dataIndex: "quantityDefected",
      key: "quantityDefected",
      align: "center",
      width: 100,
      render: (qty: number) =>
        qty > 0 ? <Tag color="red">{qty}</Tag> : <Tag>0</Tag>,
    },
    {
      title: t("materialCost"),
      dataIndex: "totalMaterialCost",
      key: "totalMaterialCost",
      align: "right",
      width: 120,
      render: (cost: number) => `₪${cost.toFixed(2)}`,
    },
    {
      title: t("productValue"),
      dataIndex: "productValue",
      key: "productValue",
      align: "right",
      width: 120,
      render: (value: number) => `₪${value.toFixed(2)}`,
    },
    {
      title: t("grossProfit"),
      dataIndex: "grossProfit",
      key: "grossProfit",
      align: "right",
      width: 120,
      render: (profit: number) => (
        <Tag color={profit >= 0 ? "green" : "red"}>₪{profit.toFixed(2)}</Tag>
      ),
    },
    {
      title: t("profitPercentage"),
      dataIndex: "grossProfitPercentage",
      key: "grossProfitPercentage",
      align: "right",
      width: 100,
      render: (percentage: number) => (
        <Tag color={percentage >= 0 ? "cyan" : "red"}>
          {percentage.toFixed(1)}%
        </Tag>
      ),
    },
  ];

  const LoadingSkeleton = () => (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* Header Skeleton */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <Skeleton.Button active size="large" style={{ width: 100 }} />
        <Skeleton.Input active size="large" style={{ width: 300 }} />
        <Space>
          <Skeleton.Button active size="large" style={{ width: 160 }} />
          <Skeleton.Button active size="large" style={{ width: 100 }} />
        </Space>
      </div>

      <Divider style={{ margin: "16px 0" }} />

      {/* KPI Cards Skeleton */}
      <Row gutter={[24, 24]}>
        {[1, 2, 3, 4].map((item) => (
          <Col key={item} xs={24} sm={12} md={6}>
            <Card
              bordered={false}
              style={{
                borderRadius: "12px",
                background: "#f5f5f5",
                minHeight: "120px",
              }}
            >
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Products Section Skeleton */}
      <div style={{ marginTop: "40px" }}>
        <Skeleton.Input active style={{ width: 200, marginBottom: 24 }} />
        <Card style={{ marginBottom: 16, borderRadius: "8px" }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
        <Card style={{ marginBottom: 16, borderRadius: "8px" }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      </div>

      {/* Table Skeleton */}
      <div style={{ marginTop: "40px" }}>
        <Skeleton.Input active style={{ width: 200, marginBottom: 24 }} />
        <Card style={{ borderRadius: "8px" }}>
          <Skeleton active paragraph={{ rows: 5 }} />
        </Card>
      </div>
    </Space>
  );

  return (
    <div
      style={{
        padding: "32px 24px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
        <Card
          style={{
            borderRadius: "16px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
          }}
        >
          {loading ? (
            <Spin
              spinning={loading}
              indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
              tip={
                <Text
                  style={{
                    fontSize: "16px",
                    marginTop: "16px",
                    display: "block",
                  }}
                >
                  {t("loading")}
                </Text>
              }
            >
              <LoadingSkeleton />
            </Spin>
          ) : (
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <BackButton
                  onClick={() => router.back()}
                  size="large"
                  style={{ minWidth: "100px" }}
                >
                  {t("back")}
                </BackButton>
                <Title
                  level={2}
                  style={{ margin: 0, fontSize: "28px", fontWeight: 600 }}
                >
                  {t("pageTitle")}
                </Title>
                <Space size="middle" wrap>
                  <DatePicker
                    value={selectedDate}
                    onChange={handleDateChange}
                    format="YYYY-MM-DD"
                    allowClear={false}
                    size="large"
                    style={{ minWidth: "160px" }}
                  />
                  <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={() =>
                      fetchReport(selectedDate.format("YYYY-MM-DD"))
                    }
                    loading={loading}
                    size="large"
                  >
                    {t("refresh")}
                  </Button>
                  <Button
                    icon={<SaveOutlined />}
                    onClick={handleGenerateReport}
                    loading={generating}
                    size="large"
                    style={{
                      background: "#722ed1",
                      borderColor: "#722ed1",
                      color: "#fff",
                    }}
                  >
                    {t("generateAndSave")}
                  </Button>
                </Space>
              </div>

              {/* Report source indicator */}
              {report?.source && (
                <div style={{ textAlign: "center" }}>
                  <Tag
                    icon={report.source === "saved" ? <CheckCircleOutlined /> : <ThunderboltOutlined />}
                    color={report.source === "saved" ? "success" : "warning"}
                    style={{ fontSize: "13px", padding: "4px 12px" }}
                  >
                    {report.source === "saved"
                      ? `${t("reportSourceSaved")}${report.generatedAt ? ` (${dayjs(report.generatedAt).format("YYYY-MM-DD HH:mm")})` : ""}`
                      : t("reportSourceLive")}
                  </Tag>
                </div>
              )}

              <Divider style={{ margin: "16px 0" }} />

              {/* Summary Statistics */}
              {report && (
                <>
                  <Row gutter={[24, 24]}>
                    <Col xs={24} sm={12} md={6}>
                      <Card
                        bordered={false}
                        style={{
                          background:
                            "linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)",
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(255, 77, 79, 0.15)",
                        }}
                      >
                        <Statistic
                          title={
                            <span style={{ fontSize: "14px", fontWeight: 500 }}>
                              {t("totalMaterialCost")}
                            </span>
                          }
                          value={report.totalMaterialCost}
                          precision={2}
                          valueStyle={{
                            color: "#ff4d4f",
                            fontSize: "24px",
                            fontWeight: 600,
                          }}
                          prefix={
                            <ExperimentOutlined style={{ fontSize: "20px" }} />
                          }
                          suffix="₪"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card
                        bordered={false}
                        style={{
                          background:
                            "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)",
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(82, 196, 26, 0.15)",
                        }}
                      >
                        <Statistic
                          title={
                            <span style={{ fontSize: "14px", fontWeight: 500 }}>
                              {t("totalProductValue")}
                            </span>
                          }
                          value={report.totalProductValue}
                          precision={2}
                          valueStyle={{
                            color: "#52c41a",
                            fontSize: "24px",
                            fontWeight: 600,
                          }}
                          prefix={
                            <ShoppingCartOutlined
                              style={{ fontSize: "20px" }}
                            />
                          }
                          suffix="₪"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card
                        bordered={false}
                        style={{
                          background:
                            "linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)",
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(24, 144, 255, 0.15)",
                        }}
                      >
                        <Statistic
                          title={
                            <span style={{ fontSize: "14px", fontWeight: 500 }}>
                              {t("totalGrossProfit")}
                            </span>
                          }
                          value={report.totalGrossProfit}
                          precision={2}
                          valueStyle={{
                            color: "#1890ff",
                            fontSize: "24px",
                            fontWeight: 600,
                          }}
                          prefix={
                            <DollarOutlined style={{ fontSize: "20px" }} />
                          }
                          suffix="₪"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card
                        bordered={false}
                        style={{
                          background:
                            "linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)",
                          borderRadius: "12px",
                          boxShadow: "0 4px 12px rgba(114, 46, 209, 0.15)",
                        }}
                      >
                        <Statistic
                          title={
                            <span style={{ fontSize: "14px", fontWeight: 500 }}>
                              {t("grossProfitPercentage")}
                            </span>
                          }
                          value={report.overallGrossProfitPercentage}
                          precision={1}
                          suffix="%"
                          valueStyle={{
                            color: "#722ed1",
                            fontSize: "24px",
                            fontWeight: 600,
                          }}
                          prefix={<RiseOutlined style={{ fontSize: "20px" }} />}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Divider
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      marginTop: "40px",
                    }}
                  >
                    {t("productsProducedTitle")}
                  </Divider>

                  {/* Products Table */}
                  {report.productsProduced.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <Text type="secondary" style={{ fontSize: "16px" }}>
                        {t("noProductionData")}
                      </Text>
                    </div>
                  ) : (
                    <Collapse
                      accordion
                      style={{
                        background: "transparent",
                        border: "none",
                      }}
                    >
                      {report.productsProduced.map((product, index) => (
                        <Panel
                          header={
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "8px",
                              }}
                            >
                              <Text strong style={{ fontSize: "16px" }}>
                                {product.productName}
                              </Text>
                              <Space size="small" wrap>
                                <Tag
                                  color="blue"
                                  style={{
                                    fontSize: "13px",
                                    padding: "4px 12px",
                                  }}
                                >
                                  {t("produced")}: {product.quantityProduced}
                                </Tag>
                                <Tag
                                  color="purple"
                                  style={{
                                    fontSize: "13px",
                                    padding: "4px 12px",
                                  }}
                                >
                                  {t("profit")}: ₪
                                  {product.grossProfit.toFixed(2)}
                                </Tag>
                                <Tag
                                  color="cyan"
                                  style={{
                                    fontSize: "13px",
                                    padding: "4px 12px",
                                  }}
                                >
                                  {product.grossProfitPercentage.toFixed(1)}%
                                </Tag>
                              </Space>
                            </div>
                          }
                          key={index}
                          style={{
                            marginBottom: "16px",
                            background: "#fff",
                            borderRadius: "8px",
                            border: "1px solid #f0f0f0",
                            overflow: "hidden",
                          }}
                        >
                          <Space
                            direction="vertical"
                            size="large"
                            style={{ width: "100%", padding: "8px" }}
                          >
                            <Row gutter={[24, 24]}>
                              <Col xs={12} sm={12} md={6}>
                                <Card
                                  bordered={false}
                                  style={{
                                    background: "#f6ffed",
                                    borderRadius: "8px",
                                  }}
                                >
                                  <Statistic
                                    title={
                                      <span style={{ fontSize: "13px" }}>
                                        {t("quantityProduced")}
                                      </span>
                                    }
                                    value={product.quantityProduced}
                                    valueStyle={{
                                      color: "#52c41a",
                                      fontSize: "20px",
                                      fontWeight: 600,
                                    }}
                                  />
                                </Card>
                              </Col>
                              <Col xs={12} sm={12} md={6}>
                                <Card
                                  bordered={false}
                                  style={{
                                    background:
                                      product.quantityDefected > 0
                                        ? "#fff1f0"
                                        : "#f6ffed",
                                    borderRadius: "8px",
                                  }}
                                >
                                  <Statistic
                                    title={
                                      <span style={{ fontSize: "13px" }}>
                                        {t("quantityDefected")}
                                      </span>
                                    }
                                    value={product.quantityDefected}
                                    valueStyle={{
                                      color:
                                        product.quantityDefected > 0
                                          ? "#ff4d4f"
                                          : "#52c41a",
                                      fontSize: "20px",
                                      fontWeight: 600,
                                    }}
                                  />
                                </Card>
                              </Col>
                              <Col xs={12} sm={12} md={6}>
                                <Card
                                  bordered={false}
                                  style={{
                                    background: "#fff1f0",
                                    borderRadius: "8px",
                                  }}
                                >
                                  <Statistic
                                    title={
                                      <span style={{ fontSize: "13px" }}>
                                        {t("materialCost")}
                                      </span>
                                    }
                                    value={product.totalMaterialCost}
                                    precision={2}
                                    prefix="₪"
                                    valueStyle={{
                                      color: "#ff4d4f",
                                      fontSize: "20px",
                                      fontWeight: 600,
                                    }}
                                  />
                                </Card>
                              </Col>
                              <Col xs={12} sm={12} md={6}>
                                <Card
                                  bordered={false}
                                  style={{
                                    background: "#f6ffed",
                                    borderRadius: "8px",
                                  }}
                                >
                                  <Statistic
                                    title={
                                      <span style={{ fontSize: "13px" }}>
                                        {t("productValue")}
                                      </span>
                                    }
                                    value={product.productValue}
                                    precision={2}
                                    prefix="₪"
                                    valueStyle={{
                                      color: "#52c41a",
                                      fontSize: "20px",
                                      fontWeight: 600,
                                    }}
                                  />
                                </Card>
                              </Col>
                            </Row>

                            <Divider
                              style={{ fontSize: "14px", fontWeight: 500 }}
                            >
                              {t("materialsUsed")}
                            </Divider>

                            <Table
                              dataSource={product.materialsUsed}
                              columns={materialColumns}
                              rowKey="materialName"
                              pagination={false}
                              size="small"
                              style={{
                                borderRadius: "8px",
                                overflow: "hidden",
                              }}
                            />
                          </Space>
                        </Panel>
                      ))}
                    </Collapse>
                  )}

                  {/* Summary Table */}
                  <Divider
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      marginTop: "40px",
                    }}
                  >
                    {t("summaryByProduct")}
                  </Divider>
                  <Table
                    dataSource={report.productsProduced}
                    columns={productColumns}
                    rowKey="productName"
                    pagination={false}
                    scroll={{ x: true }}
                    bordered
                    style={{
                      borderRadius: "8px",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                    summary={(data) => (
                      <Table.Summary fixed>
                        <Table.Summary.Row
                          style={{
                            fontWeight: "bold",
                            background:
                              "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
                            fontSize: "14px",
                          }}
                        >
                          <Table.Summary.Cell index={0}>
                            <Text strong style={{ fontSize: "15px" }}>
                              {t("total")}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="center">
                            <Tag
                              color="green"
                              style={{
                                fontSize: "13px",
                                padding: "4px 12px",
                                fontWeight: 600,
                              }}
                            >
                              {data.reduce(
                                (sum, p) => sum + p.quantityProduced,
                                0,
                              )}
                            </Tag>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="center">
                            <Tag
                              color="red"
                              style={{
                                fontSize: "13px",
                                padding: "4px 12px",
                                fontWeight: 600,
                              }}
                            >
                              {data.reduce(
                                (sum, p) => sum + p.quantityDefected,
                                0,
                              )}
                            </Tag>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <Text
                              strong
                              style={{ fontSize: "14px", color: "#ff4d4f" }}
                            >
                              ₪{report.totalMaterialCost.toFixed(2)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">
                            <Text
                              strong
                              style={{ fontSize: "14px", color: "#52c41a" }}
                            >
                              ₪{report.totalProductValue.toFixed(2)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">
                            <Tag
                              color="green"
                              style={{
                                fontSize: "13px",
                                padding: "4px 12px",
                                fontWeight: 600,
                              }}
                            >
                              ₪{report.totalGrossProfit.toFixed(2)}
                            </Tag>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right">
                            <Tag
                              color="cyan"
                              style={{
                                fontSize: "13px",
                                padding: "4px 12px",
                                fontWeight: 600,
                              }}
                            >
                              {report.overallGrossProfitPercentage.toFixed(1)}%
                            </Tag>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
                  />

                  <Card
                    bordered={false}
                    style={{
                      background:
                        "linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)",
                      marginTop: "32px",
                      borderRadius: "12px",
                      border: "1px solid #91d5ff",
                    }}
                  >
                    <Text style={{ fontSize: "14px", color: "#002766" }}>
                      <strong style={{ fontSize: "15px" }}>
                        {t("noteTitle")}
                      </strong>{" "}
                      {t("noteMessage")}
                    </Text>
                  </Card>
                </>
              )}
            </Space>
          )}
        </Card>
      </div>
    </div>
  );
}
