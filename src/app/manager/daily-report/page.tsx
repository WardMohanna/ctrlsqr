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
} from "antd";
import {
  DollarOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
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
}

export default function DailyReportPage() {
  const router = useRouter();
  const t = useTranslations("manager.dailyReport");
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchReport = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/daily-report?date=${date}`);
      if (!res.ok) {
        throw new Error("Failed to fetch report");
      }
      const data = await res.json();
      setReport(data);
    } catch (error: any) {
      console.error("Error fetching report:", error);
      messageApi.error(t("errorLoading"));
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
      render: (qty: number) => qty > 0 ? <Tag color="red">{qty}</Tag> : <Tag>0</Tag>,
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
        <Tag color={profit >= 0 ? "green" : "red"}>
          ₪{profit.toFixed(2)}
        </Tag>
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

  return (
    <div
      style={{
        padding: "24px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* Header */}
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.back()}
              >
                {t("back")}
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                {t("pageTitle")}
              </Title>
              <Space>
                <DatePicker
                  value={selectedDate}
                  onChange={handleDateChange}
                  format="YYYY-MM-DD"
                  allowClear={false}
                />
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={() => fetchReport(selectedDate.format("YYYY-MM-DD"))}
                  loading={loading}
                >
                  {t("refresh")}
                </Button>
              </Space>
            </Space>

            <Divider />

            {/* Summary Statistics */}
            {report && (
              <>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title={t("totalMaterialCost")}
                        value={report.totalMaterialCost}
                        precision={2}
                        valueStyle={{ color: "#ff4d4f" }}
                        prefix={<ExperimentOutlined />}
                        suffix="₪"
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title={t("totalProductValue")}
                        value={report.totalProductValue}
                        precision={2}
                        valueStyle={{ color: "#52c41a" }}
                        prefix={<ShoppingCartOutlined />}
                        suffix="₪"
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title={t("totalGrossProfit")}
                        value={report.totalGrossProfit}
                        precision={2}
                        valueStyle={{ color: "#1890ff" }}
                        prefix={<DollarOutlined />}
                        suffix="₪"
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title={t("grossProfitPercentage")}
                        value={report.overallGrossProfitPercentage}
                        precision={1}
                        suffix="%"
                        valueStyle={{ color: "#722ed1" }}
                        prefix={<RiseOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                <Divider>{t("productsProducedTitle")}</Divider>

                {/* Products Table */}
                {report.productsProduced.length === 0 ? (
                  <Text type="secondary">{t("noProductionData")}</Text>
                ) : (
                  <Collapse accordion>
                    {report.productsProduced.map((product, index) => (
                      <Panel
                        header={
                          <Space style={{ width: "100%", justifyContent: "space-between" }}>
                            <Text strong>{product.productName}</Text>
                            <Space>
                              <Tag color="blue">{t("produced")}: {product.quantityProduced}</Tag>
                              <Tag color="purple">{t("profit")}: ₪{product.grossProfit.toFixed(2)}</Tag>
                              <Tag color="cyan">{product.grossProfitPercentage.toFixed(1)}%</Tag>
                            </Space>
                          </Space>
                        }
                        key={index}
                      >
                        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                          <Row gutter={16}>
                            <Col span={6}>
                              <Statistic
                                title={t("quantityProduced")}
                                value={product.quantityProduced}
                                valueStyle={{ color: "#52c41a" }}
                              />
                            </Col>
                            <Col span={6}>
                              <Statistic
                                title={t("quantityDefected")}
                                value={product.quantityDefected}
                                valueStyle={{ color: product.quantityDefected > 0 ? "#ff4d4f" : "#52c41a" }}
                              />
                            </Col>
                            <Col span={6}>
                              <Statistic
                                title={t("materialCost")}
                                value={product.totalMaterialCost}
                                precision={2}
                                prefix="₪"
                                valueStyle={{ color: "#ff4d4f" }}
                              />
                            </Col>
                            <Col span={6}>
                              <Statistic
                                title={t("productValue")}
                                value={product.productValue}
                                precision={2}
                                prefix="₪"
                                valueStyle={{ color: "#52c41a" }}
                              />
                            </Col>
                          </Row>

                          <Divider>{t("materialsUsed")}</Divider>

                          <Table
                            dataSource={product.materialsUsed}
                            columns={materialColumns}
                            rowKey="materialName"
                            pagination={false}
                            size="small"
                          />
                        </Space>
                      </Panel>
                    ))}
                  </Collapse>
                )}

                {/* Summary Table */}
                <Divider>{t("summaryByProduct")}</Divider>
                <Table
                  dataSource={report.productsProduced}
                  columns={productColumns}
                  rowKey="productName"
                  pagination={false}
                  scroll={{ x: true }}
                  summary={(data) => (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ fontWeight: "bold", background: "#fafafa" }}>
                        <Table.Summary.Cell index={0}>
                          <Text strong>{t("total")}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="center">
                          <Tag color="green">
                            {data.reduce((sum, p) => sum + p.quantityProduced, 0)}
                          </Tag>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="center">
                          <Tag color="red">
                            {data.reduce((sum, p) => sum + p.quantityDefected, 0)}
                          </Tag>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right">
                          <Text strong>₪{report.totalMaterialCost.toFixed(2)}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right">
                          <Text strong>₪{report.totalProductValue.toFixed(2)}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right">
                          <Tag color="green">
                            ₪{report.totalGrossProfit.toFixed(2)}
                          </Tag>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6} align="right">
                          <Tag color="cyan">
                            {report.overallGrossProfitPercentage.toFixed(1)}%
                          </Tag>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />

                <Card style={{ background: "#f0f2f5", marginTop: "24px" }}>
                  <Text type="secondary">
                    <strong>{t("noteTitle")}</strong> {t("noteMessage")}
                  </Text>
                </Card>
              </>
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
}
