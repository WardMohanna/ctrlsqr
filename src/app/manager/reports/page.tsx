"use client";

import React, { useState, useEffect } from "react";
import { Table, Card, DatePicker, Input, Space, Button, Tag, message } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;

interface ReportRow {
  date: string;
  task: string;
  quantity: number;
  timeWorked: string;
  bomCost: number;
  user: string;
  product: string;
}

export default function ProductionReportPage() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Filters
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterProduct, setFilterProduct] = useState<string>("");
  
  // Date filters (Default to today)
  const [filterStartDate, setFilterStartDate] = useState<string>(todayStr);
  const [filterEndDate, setFilterEndDate] = useState<string>(todayStr);

  // Fetch reports from the backend API with Date Params
  const fetchReports = async () => {
    setLoading(true);
    try {
      // Create Query Params
      const params = new URLSearchParams();
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);

      const res = await fetch(`/api/report?${params.toString()}`, { method: "GET" });
      
      if (!res.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = await res.json();
      setReports(data.report || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      messageApi.error("Error fetching reports");
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when the page loads OR when dates change
  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStartDate, filterEndDate]);

  // Client-side filtering for User and Product
  const filteredData = reports.filter((row) => {
    const matchesUser = filterUser
      ? row.user.toLowerCase().includes(filterUser.toLowerCase())
      : true;
    const matchesProduct = filterProduct
      ? row.product.toLowerCase().includes(filterProduct.toLowerCase())
      : true;
    
    return matchesUser && matchesProduct;
  });

  const columns: ColumnsType<ReportRow> = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: "User",
      dataIndex: "user",
      key: "user",
      filteredValue: filterUser ? [filterUser] : null,
      onFilter: (value, record) => record.user.toLowerCase().includes(String(value).toLowerCase()),
    },
    {
      title: "Task",
      dataIndex: "task",
      key: "task",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      align: "right",
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: "Time Worked",
      dataIndex: "timeWorked",
      key: "timeWorked",
    },
    {
      title: "BOM Cost",
      dataIndex: "bomCost",
      key: "bomCost",
      align: "right",
      render: (cost: number) => <Tag color="green">${cost.toFixed(2)}</Tag>,
      sorter: (a, b) => a.bomCost - b.bomCost,
    },
    {
      title: "Product",
      dataIndex: "product",
      key: "product",
      filteredValue: filterProduct ? [filterProduct] : null,
      onFilter: (value, record) => record.product.toLowerCase().includes(String(value).toLowerCase()),
    },
  ];

  const handleDateChange = (dates: null | (Dayjs | null)[], dateStrings: string[]) => {
    if (dates && dates[0] && dates[1]) {
      setFilterStartDate(dateStrings[0]);
      setFilterEndDate(dateStrings[1]);
    }
  };

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "calc(100vh - 64px)" }}>
      {contextHolder}
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>
              Production Report
            </h1>
          </div>

          {/* Filters */}
          <Space wrap>
            <RangePicker
              value={[
                filterStartDate ? dayjs(filterStartDate) : null,
                filterEndDate ? dayjs(filterEndDate) : null,
              ]}
              onChange={handleDateChange}
              format="YYYY-MM-DD"
            />
            <Input
              placeholder="Filter by User"
              prefix={<SearchOutlined />}
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              style={{ width: 200 }}
            />
            <Input
              placeholder="Filter by Product"
              prefix={<SearchOutlined />}
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              style={{ width: 200 }}
            />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={fetchReports}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey={(record, index) => `${record.date}-${record.task}-${index}`}
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
          />
        </Space>
      </Card>
    </div>
  );
}