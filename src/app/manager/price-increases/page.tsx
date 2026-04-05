"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTheme } from "@/hooks/useTheme";
import {
  Card,
  Button,
  Space,
  Table,
  Typography,
  Divider,
  Spin,
  Tag,
  Alert,
  DatePicker,
  Row,
  Col,
  Statistic,
  Tabs,
  Popconfirm,
  message,
} from "antd";
import {
  ArrowUpOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import { useTranslations } from "next-intl";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface PriceIncreaseItem {
  _id: string;
  itemName: string;
  sku: string;
  previousCost: number;
  newCost: number;
  changePercent: number;
  supplierName: string;
  documentId: string;
  receivedDate: string;
  acknowledged: boolean;
  createdAt: string;
}

interface ReportData {
  items: PriceIncreaseItem[];
  unacknowledgedCount: number;
}

export default function PriceIncreasesPage() {
  const goUp = useNavigateUp();
  const t = useTranslations("manager.priceIncreases");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("unacknowledged");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.set("acknowledged", activeTab === "acknowledged" ? "true" : "false");
      }
      if (dateRange) {
        params.set("startDate", dateRange[0].format("YYYY-MM-DD"));
        params.set("endDate", dateRange[1].format("YYYY-MM-DD"));
      }
      const res = await fetch(`/api/manager/price-increases?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      setData(await res.json());
    } catch {
      messageApi.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateRange, messageApi, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const acknowledge = async (ids: string[] | null, all = false) => {
    setAcknowledging(true);
    try {
      const body = all ? { acknowledgeAll: true } : { ids };
      const res = await fetch("/api/manager/price-increases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      messageApi.success(t("acknowledgeSuccess"));
      setSelectedRowKeys([]);
      await fetchData();
    } catch {
      messageApi.error(t("acknowledgeError"));
    } finally {
      setAcknowledging(false);
    }
  };

  const columns: ColumnsType<PriceIncreaseItem> = [
    {
      title: t("itemName"),
      dataIndex: "itemName",
      key: "itemName",
      width: 180,
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.sku}</Text>
        </Space>
      ),
    },
    {
      title: t("supplier"),
      dataIndex: "supplierName",
      key: "supplierName",
      width: 140,
    },
    {
      title: t("previousCost"),
      dataIndex: "previousCost",
      key: "previousCost",
      align: "right",
      width: 110,
      render: (v: number) => <Text>₪{v.toFixed(2)}</Text>,
    },
    {
      title: t("newCost"),
      dataIndex: "newCost",
      key: "newCost",
      align: "right",
      width: 110,
      render: (v: number) => (
        <Text strong style={{ color: "#cf1322" }}>₪{v.toFixed(2)}</Text>
      ),
    },
    {
      title: t("change"),
      dataIndex: "changePercent",
      key: "changePercent",
      align: "right",
      width: 100,
      sorter: (a, b) => b.changePercent - a.changePercent,
      render: (v: number) => (
        <Tag color="red" icon={<ArrowUpOutlined />}>
          +{v.toFixed(1)}%
        </Tag>
      ),
    },
    {
      title: t("documentId"),
      dataIndex: "documentId",
      key: "documentId",
      width: 130,
    },
    {
      title: t("receivedDate"),
      dataIndex: "receivedDate",
      key: "receivedDate",
      width: 120,
      sorter: (a, b) =>
        new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime(),
      render: (d: string) => dayjs(d).format("YYYY-MM-DD"),
    },
    {
      title: t("status"),
      dataIndex: "acknowledged",
      key: "acknowledged",
      width: 110,
      render: (v: boolean) =>
        v ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>{t("acknowledgedTag")}</Tag>
        ) : (
          <Tag color="warning" icon={<WarningOutlined />}>{t("pendingTag")}</Tag>
        ),
    },
    {
      title: t("actions"),
      key: "actions",
      width: 110,
      render: (_: any, record: PriceIncreaseItem) =>
        !record.acknowledged ? (
          <Button
            size="small"
            type="link"
            icon={<CheckCircleOutlined />}
            loading={acknowledging}
            onClick={() => acknowledge([record._id])}
          >
            {t("acknowledge")}
          </Button>
        ) : null,
    },
  ];

  const unacknowledgedCount = data?.unacknowledgedCount ?? 0;
  const items = data?.items ?? [];

  return (
    <div
      style={{
        padding: "32px 24px",
        background: isDark ? "#1f1f1f" : "#ffffff",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>

          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <BackButton onClick={goUp} size="large">
              {t("back")}
            </BackButton>
            <Title level={2} style={{ margin: 0 }}>
              {t("pageTitle")}
            </Title>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
              size="large"
            >
              {t("refresh")}
            </Button>
          </div>

          <Divider style={{ margin: "8px 0" }} />

          {/* Notification banner for unacknowledged */}
          {unacknowledgedCount > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={t("notificationTitle", { count: unacknowledgedCount })}
              description={t("notificationDescription")}
              action={
                <Popconfirm
                  title={t("acknowledgeAllConfirm")}
                  onConfirm={() => acknowledge(null, true)}
                  okText={t("yes")}
                  cancelText={t("no")}
                >
                  <Button
                    size="small"
                    type="primary"
                    loading={acknowledging}
                  >
                    {t("acknowledgeAll")}
                  </Button>
                </Popconfirm>
              }
              style={{ borderRadius: 8 }}
            />
          )}

          {/* KPI Cards */}
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                style={{
                  background: "linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)",
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(255,77,79,0.15)",
                }}
              >
                <Statistic
                  title={
                    <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.72)" }}>
                      {t("unacknowledgedCount")}
                    </span>
                  }
                  value={unacknowledgedCount}
                  valueStyle={{ color: "#cf1322", fontWeight: 600, fontSize: 28 }}
                  prefix={<WarningOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                style={{
                  background: "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)",
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(82,196,26,0.15)",
                }}
              >
                <Statistic
                  title={
                    <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.72)" }}>
                      {t("totalRecords")}
                    </span>
                  }
                  value={items.length}
                  valueStyle={{ color: "#389e0d", fontWeight: 600, fontSize: 28 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                style={{
                  background: "linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)",
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(22,119,255,0.15)",
                }}
              >
                <Statistic
                  title={
                    <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.72)" }}>
                      {t("avgChange")}
                    </span>
                  }
                  value={
                    items.length
                      ? items.reduce((s, i) => s + i.changePercent, 0) / items.length
                      : 0
                  }
                  precision={1}
                  suffix="%"
                  prefix={<ArrowUpOutlined />}
                  valueStyle={{ color: "#0958d9", fontWeight: 600, fontSize: 28 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Filter + Table */}
          <Card style={{ borderRadius: 12 }}>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <RangePicker
                  value={dateRange}
                  onChange={(v) => setDateRange(v as [Dayjs, Dayjs] | null)}
                  allowClear
                  size="middle"
                />
                {selectedRowKeys.length > 0 && (
                  <Popconfirm
                    title={t("acknowledgeSelectedConfirm", { count: selectedRowKeys.length })}
                    onConfirm={() => acknowledge(selectedRowKeys)}
                    okText={t("yes")}
                    cancelText={t("no")}
                  >
                    <Button type="primary" icon={<CheckCircleOutlined />} loading={acknowledging}>
                      {t("acknowledgeSelected", { count: selectedRowKeys.length })}
                    </Button>
                  </Popconfirm>
                )}
              </div>

              <Tabs
                activeKey={activeTab}
                onChange={(k) => { setActiveTab(k); setSelectedRowKeys([]); }}
                items={[
                  { key: "unacknowledged", label: `${t("tabPending")} (${unacknowledgedCount})` },
                  { key: "acknowledged", label: t("tabAcknowledged") },
                  { key: "all", label: t("tabAll") },
                ]}
              />

              <Spin
                spinning={loading}
                indicator={<LoadingOutlined style={{ fontSize: 32, color: isDark ? "#fff" : undefined }} spin />}
              >
                <Table
                  rowKey="_id"
                  columns={columns}
                  dataSource={items}
                  rowSelection={
                    activeTab !== "acknowledged"
                      ? {
                          selectedRowKeys,
                          onChange: (keys) => setSelectedRowKeys(keys as string[]),
                          getCheckboxProps: (record) => ({
                            disabled: record.acknowledged,
                          }),
                        }
                      : undefined
                  }
                  pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t2) => `${t2} ${t("totalItems")}` }}
                  scroll={{ x: "max-content" }}
                  size="middle"
                  bordered
                />
              </Spin>
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  );
}
