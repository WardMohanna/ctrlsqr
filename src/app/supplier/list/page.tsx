"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { Table, Button, Card, Space, message, Spin, Modal } from "antd";
import {
  ArrowRightOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
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
  const goUp = useNavigateUp();
  const t = useTranslations("supplier.list");
  const { theme } = useTheme();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const [pageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const topRef = useRef<HTMLDivElement | null>(null);

  // Multi-select states
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/supplier?paginated=true&page=${currentPage}&limit=${pageSize}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(t("errorFetching"));
        }
        return res.json();
      })
      .then((data) => {
        setSuppliers(data.items ?? []);
        setTotal(data.total ?? 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching suppliers:", err);
        messageApi.error(t("errorLoading"));
        setLoading(false);
      });
  }, [currentPage, pageSize, t, messageApi]);

  const translatePaymentTerm = (term: string | undefined) => {
    if (!term) return "-";
    const key = `option_${term.toLowerCase().replace(/\s+/g, "")}`;
    return t(key, { defaultValue: term });
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning(
        t("noItemsSelected", {
          defaultValue: "Please select at least one supplier to delete",
        }),
      );
      return;
    }

    Modal.confirm({
      title: t("confirmDelete", { defaultValue: "Confirm Delete" }),
      content: t("confirmDeleteMessage", {
        defaultValue: `Are you sure you want to delete ${selectedRowKeys.length} supplier(s)? This action cannot be undone.`,
        count: selectedRowKeys.length,
      }),
      okText: t("delete", { defaultValue: "Delete" }),
      okType: "danger",
      cancelText: t("cancel", { defaultValue: "Cancel" }),
      onOk: async () => {
        setDeleteLoading(true);
        try {
          const deletePromises = selectedRowKeys.map((id) =>
            fetch(`/api/supplier/${id}`, { method: "DELETE" }),
          );

          const results = await Promise.all(deletePromises);
          const failedDeletes = results.filter((res) => !res.ok);

          if (failedDeletes.length > 0) {
            messageApi.error(
              t("deleteError", {
                defaultValue: "Some suppliers could not be deleted",
              }),
            );
          } else {
            messageApi.success(
              t("deleteSuccess", {
                defaultValue: `Successfully deleted ${selectedRowKeys.length} supplier(s)`,
                count: selectedRowKeys.length,
              }),
            );
            // Refresh the supplier list
            setSuppliers((prev) =>
              prev.filter((sup) => !selectedRowKeys.includes(sup._id)),
            );
            setTotal((prev) => Math.max(prev - selectedRowKeys.length, 0));
            setSelectedRowKeys([]);
          }
        } catch (error) {
          console.error("Error deleting suppliers:", error);
          messageApi.error(
            t("deleteError", { defaultValue: "Failed to delete suppliers" }),
          );
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

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
          background: theme === "dark" ? "#1f1f1f" : "#ffffff",
        }}
      >
        <Spin
          size="large"
          style={{ color: theme === "dark" ? "#ffffff" : undefined }}
        />
      </div>
    );
  }

  return (
    <div
      ref={topRef}
      style={{
        padding: "24px",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {contextHolder}
      <div style={{ marginBottom: 16 }}>
        <BackButton onClick={goUp}>{t("back")}</BackButton>
      </div>
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
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push("/supplier/add")}
              >
                {t("addSupplier")}
              </Button>
            </Space>
          </div>

          {/* Bulk Actions */}
          {selectedRowKeys.length > 0 && (
            <Space>
              <span style={{ marginRight: 8 }}>
                {t("selectedCount", {
                  defaultValue: `${selectedRowKeys.length} selected`,
                  count: selectedRowKeys.length,
                })}
              </span>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBulkDelete}
                loading={deleteLoading}
              >
                {t("delete", { defaultValue: "Delete" })}
              </Button>
            </Space>
          )}

          <Table
            columns={columns}
            dataSource={suppliers}
            rowKey="_id"
            loading={loading}
            rowSelection={rowSelection}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total,
              showSizeChanger: false,
              showTotal: (totalItems) => `Total ${totalItems} suppliers`,
              onChange: (page) => {
                setCurrentPage(page);
                topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              },
            }}
          />
        </Space>
      </Card>
    </div>
  );
}
