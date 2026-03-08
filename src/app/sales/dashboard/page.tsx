"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  message,
} from "antd";
import { ArrowLeftOutlined, BarChartOutlined } from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import dayjs from "dayjs";

interface Sale {
  _id: string;
  saleNumber: string;
  saleDate: string;
  totalBeforeDiscount: number;
  totalDiscount: number;
  finalTotal: number;
  accountId: any;
}

interface Account {
  _id: string;
  officialEntityName: string;
  category: string;
}

export default function SalesDashboardPage() {
  const router = useRouter();
  const t = useTranslations("sales.dashboard");
  const [sales, setSales] = useState<Sale[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "custom">("30d");
  const [customDates, setCustomDates] = useState<[any, any] | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [salesRes, accountsRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/accounts"),
      ]);

      if (salesRes.ok) {
        const data = await salesRes.json();
        setSales(data);
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data);
      }
    } catch (error) {
      messageApi.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  }

  // Filter sales based on date range
  function getDateRange() {
    const now = dayjs();
    if (dateRange === "today") {
      return [now.startOf("day"), now.endOf("day")];
    } else if (dateRange === "7d") {
      return [now.subtract(7, "day").startOf("day"), now.endOf("day")];
    } else if (dateRange === "30d") {
      return [now.subtract(30, "day").startOf("day"), now.endOf("day")];
    } else if (dateRange === "custom" && customDates) {
      return [customDates[0], customDates[1]];
    }
    return [null, null];
  }

  // Filter sales
  const filteredSales = sales.filter((sale) => {
    const [startDate, endDate] = getDateRange();
    const saleDate = dayjs(sale.saleDate);

    // Date filter
    if (startDate && endDate) {
      if (!saleDate.isBetween(startDate, endDate, null, "[]")) {
        return false;
      }
    }

    // Account filter
    if (selectedAccounts.length > 0 && !selectedAccounts.includes(sale.accountId._id)) {
      return false;
    }

    // Category filter
    if (selectedCategory && sale.accountId.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  // Calculate metrics
  const metrics = {
    totalSales: filteredSales.reduce((sum, s) => sum + s.totalBeforeDiscount, 0),
    totalDiscount: filteredSales.reduce((sum, s) => sum + s.totalDiscount, 0),
    netSales: filteredSales.reduce((sum, s) => sum + s.finalTotal, 0),
    count: filteredSales.length,
  };

  // Sales by account
  const salesByAccount = filteredSales.reduce((acc: any, sale) => {
    const accountName = sale.accountId.officialEntityName;
    const existing = acc.find((a: any) => a.accountName === accountName);
    if (existing) {
      existing.total += sale.finalTotal;
      existing.count += 1;
    } else {
      acc.push({
        accountName,
        total: sale.finalTotal,
        count: 1,
      });
    }
    return acc;
  }, []);

  // Sales by category
  const salesByCategory = filteredSales.reduce((acc: any, sale) => {
    const category = sale.accountId.category;
    const existing = acc.find((c: any) => c.category === category);
    if (existing) {
      existing.total += sale.finalTotal;
      existing.count += 1;
    } else {
      acc.push({
        category,
        total: sale.finalTotal,
        count: 1,
      });
    }
    return acc;
  }, []);

  const salesTableColumns = [
    {
      title: t("saleNumber"),
      dataIndex: "saleNumber",
      key: "saleNumber",
    },
    {
      title: t("account"),
      key: "account",
      render: (text: any, record: Sale) => record.accountId.officialEntityName,
    },
    {
      title: t("date"),
      dataIndex: "saleDate",
      key: "saleDate",
      render: (date: string) => dayjs(date).format("YYYY-MM-DD"),
    },
    {
      title: t("amount"),
      dataIndex: "finalTotal",
      key: "finalTotal",
      render: (value: number) => `$${value.toFixed(2)}`,
    },
  ];

  const accountTableColumns = [
    {
      title: t("accountName"),
      dataIndex: "accountName",
      key: "accountName",
    },
    {
      title: t("salesCount"),
      dataIndex: "count",
      key: "count",
    },
    {
      title: t("totalAmount"),
      dataIndex: "total",
      key: "total",
      render: (value: number) => `$${value.toFixed(2)}`,
    },
  ];

  const categoryTableColumns = [
    {
      title: t("category"),
      dataIndex: "category",
      key: "category",
    },
    {
      title: t("salesCount"),
      dataIndex: "count",
      key: "count",
    },
    {
      title: t("totalAmount"),
      dataIndex: "total",
      key: "total",
      render: (value: number) => `$${value.toFixed(2)}`,
    },
  ];

  // Get unique categories
  const categories = [...new Set(accounts.map((a) => a.category))];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <BackButton onClick={() => router.back()} size="large">
            {t("back")}
          </BackButton>

          <Card
            style={{
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: "24px",
              }}
            >
              {t("title")}
            </h1>

            {/* FILTERS */}
            <Card size="small" style={{ marginBottom: "24px", backgroundColor: "#f5f5f5" }}>
              <h3>{t("filters")}</h3>
              <Row gutter={16}>
                <Col xs={24} md={6}>
                  <label>{t("dateRange")}</label>
                  <Select
                    value={dateRange}
                    onChange={(value) => setDateRange(value)}
                    style={{ width: "100%" }}
                  >
                    <Select.Option value="today">{t("today")}</Select.Option>
                    <Select.Option value="7d">{t("last7Days")}</Select.Option>
                    <Select.Option value="30d">{t("last30Days")}</Select.Option>
                    <Select.Option value="custom">{t("custom")}</Select.Option>
                  </Select>
                </Col>

                {dateRange === "custom" && (
                  <Col xs={24} md={6}>
                    <label>{t("dateRange")}</label>
                    <DatePicker.RangePicker
                      value={customDates}
                      onChange={(dates) => setCustomDates(dates as [any, any])}
                      style={{ width: "100%" }}
                    />
                  </Col>
                )}

                <Col xs={24} md={6}>
                  <label>{t("account")}</label>
                  <Select
                    mode="multiple"
                    placeholder={t("selectAccounts")}
                    value={selectedAccounts}
                    onChange={(value) => setSelectedAccounts(value)}
                    style={{ width: "100%" }}
                  >
                    {accounts.map((account) => (
                      <Select.Option key={account._id} value={account._id}>
                        {account.officialEntityName}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>

                <Col xs={24} md={6}>
                  <label>{t("category")}</label>
                  <Select
                    allowClear
                    placeholder={t("selectCategory")}
                    value={selectedCategory || undefined}
                    onChange={(value) => setSelectedCategory(value || "")}
                    style={{ width: "100%" }}
                  >
                    {categories.map((cat) => (
                      <Select.Option key={cat} value={cat}>
                        {cat}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
              </Row>
            </Card>

            {/* METRICS */}
            <Row gutter={16} style={{ marginBottom: "32px" }}>
              <Col xs={24} md={6}>
                <Card>
                  <Statistic
                    title={t("totalSales")}
                    value={metrics.totalSales}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: "#1f2937" }}
                  />
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card>
                  <Statistic
                    title={t("totalDiscount")}
                    value={metrics.totalDiscount}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: "#dc2626" }}
                  />
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card>
                  <Statistic
                    title={t("netSales")}
                    value={metrics.netSales}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: "#059669" }}
                  />
                </Card>
              </Col>
              <Col xs={24} md={6}>
                <Card>
                  <Statistic
                    title={t("count")}
                    value={metrics.count}
                    valueStyle={{ color: "#7c3aed" }}
                  />
                </Card>
              </Col>
            </Row>

            {/* SALES TABLE */}
            <h3 style={{ marginBottom: "16px" }}>{t("recentSales")}</h3>
            <Table
              columns={salesTableColumns}
              dataSource={filteredSales.slice(0, 10)}
              rowKey="_id"
              loading={loading}
              pagination={false}
              scroll={{ x: 800 }}
              style={{ marginBottom: "32px" }}
            />

            {/* SALES BY ACCOUNT */}
            <h3 style={{ marginBottom: "16px" }}>{t("salesByAccount")}</h3>
            <Table
              columns={accountTableColumns}
              dataSource={salesByAccount}
              rowKey="accountName"
              pagination={false}
              scroll={{ x: 800 }}
              style={{ marginBottom: "32px" }}
            />

            {/* SALES BY CATEGORY */}
            <h3 style={{ marginBottom: "16px" }}>{t("sallesByCategory")}</h3>
            <Table
              columns={categoryTableColumns}
              dataSource={salesByCategory}
              rowKey="category"
              pagination={false}
              scroll={{ x: 800 }}
            />
          </Card>
        </Space>
      </div>
    </div>
  );
}
