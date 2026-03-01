"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Table,
  Button,
  Card,
  Space,
  Modal,
  message,
  Input,
  Select,
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";

interface Account {
  _id: string;
  officialEntityName: string;
  taxId: string;
  category: string;
  city?: string;
  active: boolean;
  createdAt: string;
}

export default function AccountsListPage() {
  const router = useRouter();
  const t = useTranslations("accounts.list");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [categories, setCategories] = useState([]);

  // Fetch accounts list
  useEffect(() => {
    fetchAccounts();
    fetchCategories();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      messageApi.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const response = await fetch("/api/account-categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: t("deleteConfirm"),
      content: `${t("deleteMessage")} "${name}"?`,
      okText: t("delete"),
      okType: "danger",
      cancelText: t("cancel"),
      onOk: async () => {
        try {
          const response = await fetch(`/api/accounts/${id}`, {
            method: "DELETE",
          });

          if (response.ok) {
            messageApi.success(t("deleteSuccess"));
            fetchAccounts();
          } else {
            messageApi.error(t("deleteError"));
          }
        } catch (error) {
          messageApi.error(t("deleteError"));
        }
      },
    });
  };

  // Filter accounts based on search and filters
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.officialEntityName
        .toLowerCase()
        .includes(searchText.toLowerCase()) ||
      account.taxId.toLowerCase().includes(searchText.toLowerCase());

    const matchesCategory = !filterCategory || account.category === filterCategory;

    const matchesActive =
      !filterActive || (filterActive === "true" ? account.active : !account.active);

    return matchesSearch && matchesCategory && matchesActive;
  });

  const columns = [
    {
      title: t("entityName"),
      dataIndex: "officialEntityName",
      key: "officialEntityName",
      sorter: (a: Account, b: Account) =>
        a.officialEntityName.localeCompare(b.officialEntityName),
    },
    {
      title: t("taxId"),
      dataIndex: "taxId",
      key: "taxId",
    },
    {
      title: t("category"),
      dataIndex: "category",
      key: "category",
      filters: categories.map((cat: any) => ({
        text: cat.name,
        value: cat.name,
      })),
      onFilter: (value: any, record: Account) => record.category === value,
    },
    {
      title: t("city"),
      dataIndex: "city",
      key: "city",
    },
    {
      title: t("status"),
      dataIndex: "active",
      key: "active",
      render: (active: boolean) => (
        <span style={{ color: active ? "green" : "red" }}>
          {active ? t("active") : t("inactive")}
        </span>
      ),
      filters: [
        { text: t("active"), value: true },
        { text: t("inactive"), value: false },
      ],
      onFilter: (value: any, record: Account) => record.active === value,
    },
    {
      title: t("actions"),
      key: "actions",
      render: (text: any, record: Account) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/accounts/${record._id}/history`)}
          >
            {t("history")}
          </Button>
          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            onClick={() => router.push(`/accounts/${record._id}/edit`)}
          >
            {t("edit")}
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() =>
              handleDelete(record._id, record.officialEntityName)
            }
          >
            {t("delete")}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <BackButton onClick={() => router.back()} size="large">
              {t("back")}
            </BackButton>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => router.push("/accounts/add")}
            >
              {t("addAccount")}
            </Button>
          </div>

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
            <Row gutter={16} style={{ marginBottom: "24px" }}>
              <Col xs={24} md={8}>
                <Input
                  placeholder={t("searchPlaceholder")}
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </Col>
              <Col xs={24} md={8}>
                <Select
                  allowClear
                  placeholder={t("filterCategory")}
                  value={filterCategory || undefined}
                  onChange={(value) => setFilterCategory(value || "")}
                  style={{ width: "100%" }}
                >
                  {categories.map((cat: any) => (
                    <Select.Option key={cat._id} value={cat.name}>
                      {cat.name}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} md={8}>
                <Select
                  allowClear
                  placeholder={t("filterStatus")}
                  value={filterActive || undefined}
                  onChange={(value) => setFilterActive(value || "")}
                  style={{ width: "100%" }}
                >
                  <Select.Option value="true">{t("active")}</Select.Option>
                  <Select.Option value="false">{t("inactive")}</Select.Option>
                </Select>
              </Col>
            </Row>

            {/* TABLE */}
            <Table
              columns={columns}
              dataSource={filteredAccounts}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10, total: filteredAccounts.length }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </Space>
      </div>
    </div>
  );
}
