"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Table, Button, Card, Space, message, Spin } from "antd";
import {
  ArrowRightOutlined,
  PlusOutlined,
  EditOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface Supplier {
  _id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ShowSuppliersPage() {
  const router = useRouter();
  const t = useTranslations("supplier.list");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetch("/api/supplier")
      .then((res) => {
        if (!res.ok) {
          throw new Error(t("errorFetching"));
        }
        return res.json();
      })
      .then((data: Supplier[]) => {
        setSuppliers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching suppliers:", err);
        messageApi.error(t("errorLoading"));
        setLoading(false);
      });
  }, [t, messageApi]);

  const columns: ColumnsType<Supplier> = [
    {
      title: t("name"),
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t("contact"),
      dataIndex: "contactName",
      key: "contactName",
      render: (text) => text || "-",
    },
    {
      title: t("phone"),
      dataIndex: "phone",
      key: "phone",
      render: (text) => text || "-",
    },
    {
      title: t("email"),
      dataIndex: "email",
      key: "email",
      render: (text) => text || "-",
    },
    {
      title: t("address"),
      dataIndex: "address",
      key: "address",
      render: (text) => text || "-",
    },
    {
      title: t("taxId"),
      dataIndex: "taxId",
      key: "taxId",
      render: (text) => text || "-",
    },
    {
      title: t("paymentTerms"),
      dataIndex: "paymentTerms",
      key: "paymentTerms",
      render: (text) => translatePaymentTerm(text),
    },
    {
      title: t("actions"),
      key: "actions",
      align: "right",
      render: (_, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => router.push(`/supplier/edit?id=${record._id}`)}
        >
          {t("edit")}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {contextHolder}
      <Card>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>
              {t("suppliersListTitle")}
            </h1>
            <Space>
              <Button
                icon={<ArrowRightOutlined />}
                onClick={() => router.back()}
              >
                {t("back")}
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push("/supplier/add")}
              >
                {t("addSupplier")}
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={suppliers}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: pageSize,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} suppliers`,
              pageSizeOptions: ["10", "20", "50", "100"],
              onShowSizeChange: (current, size) => setPageSize(size),
            }}
          />
        </Space>
      </Card>
    </div>
  );
}
