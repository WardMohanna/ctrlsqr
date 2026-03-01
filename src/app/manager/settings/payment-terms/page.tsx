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
  InputNumber,
  Form,
  Drawer,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";

interface PaymentTerms {
  _id: string;
  name: string;
  days: number;
  description?: string;
}

export default function PaymentTermsPage() {
  const router = useRouter();
  const t = useTranslations("settings.paymentTerms");
  const [terms, setTerms] = useState<PaymentTerms[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerms | null>(null);
  const [form] = Form.useForm();

  // Fetch payment terms
  useEffect(() => {
    fetchTerms();
  }, []);

  async function fetchTerms() {
    setLoading(true);
    try {
      const response = await fetch("/api/payment-terms");
      if (response.ok) {
        const data = await response.json();
        setTerms(data);
      }
    } catch (error) {
      messageApi.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  }

  const handleOpenDrawer = (term?: PaymentTerms) => {
    if (term) {
      setEditingTerm(term);
      form.setFieldsValue(term);
    } else {
      setEditingTerm(null);
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingTerm(null);
    form.resetFields();
  };

  async function handleSave(values: any) {
    setLoading(true);
    try {
      const url = editingTerm
        ? `/api/payment-terms/${editingTerm._id}`
        : "/api/payment-terms";
      const method = editingTerm ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "saveError");
      }

      messageApi.success(
        editingTerm ? t("updateSuccess") : t("createSuccess")
      );
      handleCloseDrawer();
      fetchTerms();
    } catch (err: any) {
      messageApi.error(t(err.message || "saveError"));
    } finally {
      setLoading(false);
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
          const response = await fetch(`/api/payment-terms/${id}`, {
            method: "DELETE",
          });

          if (response.ok) {
            messageApi.success(t("deleteSuccess"));
            fetchTerms();
          } else {
            messageApi.error(t("deleteError"));
          }
        } catch (error) {
          messageApi.error(t("deleteError"));
        }
      },
    });
  };

  const columns = [
    {
      title: t("name"),
      dataIndex: "name",
      key: "name",
      sorter: (a: PaymentTerms, b: PaymentTerms) =>
        a.name.localeCompare(b.name),
    },
    {
      title: t("days"),
      dataIndex: "days",
      key: "days",
      sorter: (a: PaymentTerms, b: PaymentTerms) => a.days - b.days,
      render: (days: number) => `${days} ${t("daysLabel")}`,
    },
    {
      title: t("description"),
      dataIndex: "description",
      key: "description",
    },
    {
      title: t("actions"),
      key: "actions",
      render: (text: any, record: PaymentTerms) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenDrawer(record)}
          >
            {t("edit")}
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id, record.name)}
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
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
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
              onClick={() => handleOpenDrawer()}
            >
              {t("addTerm")}
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

            <Table
              columns={columns}
              dataSource={terms}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Space>
      </div>

      {/* FORM DRAWER */}
      <Drawer
        title={editingTerm ? t("editTerm") : t("addTerm")}
        onClose={handleCloseDrawer}
        open={drawerOpen}
        width={400}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="name"
            label={t("name")}
            rules={[{ required: true, message: t("nameRequired") }]}
          >
            <Input placeholder={t("namePlaceholder")} />
          </Form.Item>

          <Form.Item
            name="days"
            label={t("days")}
            rules={[{ required: true, message: t("daysRequired") }]}
          >
            <InputNumber min={0} placeholder={t("daysPlaceholder")} />
          </Form.Item>

          <Form.Item name="description" label={t("description")}>
            <Input.TextArea placeholder={t("descriptionPlaceholder")} rows={4} />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
          >
            {t("save")}
          </Button>
        </Form>
      </Drawer>
    </div>
  );
}
