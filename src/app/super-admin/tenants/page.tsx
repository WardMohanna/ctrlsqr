"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Table,
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  Space,
  Modal,
  message,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslations } from "next-intl";
import BackButton from "@/components/BackButton";
import { useNavigateUp } from "@/hooks/useNavigateUp";

type Tenant = {
  _id: string;
  name: string;
  purchasedUsers: number;
  isActive: boolean;
  createdAt: string;
};

export default function TenantsPage() {
  const t = useTranslations("superAdmin");
  const { data: session, status } = useSession();
  const router = useRouter();
  const goUp = useNavigateUp();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<string | null>(null);

  const [addForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any).role !== "super_admin") {
      router.replace("/welcomePage");
    }
  }, [session, status, router]);

  useEffect(() => {
    if ((session?.user as any)?.role !== "super_admin") return;
    fetchTenants();
  }, [session]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants");
      const data = await res.json();
      if (Array.isArray(data)) setTenants(data);
      else messageApi.error(t("loadError"));
    } catch {
      messageApi.error(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTenant = async (values: any) => {
    setCreatedAdmin(null);
    setModalLoading(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          purchasedUsers: values.purchasedUsers ?? 1,
          adminName: values.adminName,
          adminLastname: values.adminLastname,
          adminPassword: values.adminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        messageApi.error(data.error ?? t("createError"));
      } else {
        messageApi.success(t("createSuccess"));
        setCreatedAdmin(data.adminUserName);
        addForm.resetFields();
        setModalOpen(false);
        fetchTenants();
      }
    } catch {
      messageApi.error(t("networkErrorRetry"));
    } finally {
      setModalLoading(false);
    }
  };

  const columns: ColumnsType<Tenant> = [
    {
      title: t("colTenantName"),
      dataIndex: "name",
      key: "name",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: t("colSeats"),
      dataIndex: "purchasedUsers",
      key: "purchasedUsers",
      width: 100,
    },
    {
      title: t("colStatus"),
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
      render: (val) => (
        <Tag color={val ? "success" : "error"}>{val ? t("statusActive") : t("statusInactive")}</Tag>
      ),
    },
    {
      title: t("colCreated"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      responsive: ["sm"],
      render: (val) => new Date(val).toLocaleDateString(),
    },
  ];

  if (status === "loading") return null;
  if ((session?.user as any)?.role !== "super_admin") return null;

  return (
    <div style={{ minHeight: "100vh", padding: "24px" }}>
      {contextHolder}
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>

          <BackButton onClick={goUp}>{t("back")}</BackButton>

          <Card
            title={
              <span style={{ fontSize: "24px", fontWeight: "bold" }}>
                🏢 {t("pageTitle")}
              </span>
            }
            extra={
              <Button
                type="primary"
                shape="circle"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => { setCreatedAdmin(null); setModalOpen(true); }}
              />
            }
            style={{ borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
          >
            {createdAdmin && (
              <div style={{ marginBottom: 16, color: "#52c41a", fontSize: "0.9rem" }}>
                ✓ {t("adminCreated")}<strong>{createdAdmin}</strong>
              </div>
            )}

            <Table
              columns={columns}
              dataSource={tenants}
              rowKey="_id"
              loading={loading}
              size="middle"
              scroll={{ x: 700 }}
              pagination={{ pageSize: 10 }}
              onRow={(record) => ({
                onDoubleClick: () => router.push(`/super-admin/tenants/${record._id}`),
                style: { cursor: "pointer" },
              })}
            />
          </Card>

        </Space>
      </div>

      <Modal
        open={modalOpen}
        title={t("tenantsTitle")}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={addForm}
          onFinish={handleAddTenant}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label={t("tenantName")}
            rules={[{ required: true, message: t("required") }]}
          >
            <Input placeholder={t("tenantNamePlaceholder")} />
          </Form.Item>
          <Form.Item name="purchasedUsers" label={t("seats")} initialValue={1}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="adminName"
            label={t("adminFirstName")}
            rules={[{ required: true, message: t("required") }]}
          >
            <Input placeholder={t("adminFirstName")} />
          </Form.Item>
          <Form.Item
            name="adminLastname"
            label={t("adminLastName")}
            rules={[{ required: true, message: t("required") }]}
          >
            <Input placeholder={t("adminLastName")} />
          </Form.Item>
          <Form.Item
            name="adminPassword"
            label={t("adminPassword")}
            rules={[{ required: true, min: 6, message: t("adminPasswordMin") }]}
          >
            <Input.Password placeholder={t("adminPasswordPlaceholder")} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={modalLoading}
              icon={<PlusOutlined />}
            >
              {t("add")}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
