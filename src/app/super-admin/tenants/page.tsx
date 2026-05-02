"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  Tooltip,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  TeamOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
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
  const [isAdminUserNameCustomized, setIsAdminUserNameCustomized] = useState(false);

  const [addForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const fetchTenants = useCallback(async () => {
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
  }, [messageApi, t]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any).role !== "super_admin") {
      router.replace("/welcomePage");
    }
  }, [session, status, router]);

  useEffect(() => {
    if ((session?.user as any)?.role !== "super_admin") return;
    fetchTenants();
  }, [fetchTenants, session]);

  const generateUserName = (name?: string, lastname?: string): string => {
    const firstName = String(name ?? "").trim().toLowerCase();
    const lastName = String(lastname ?? "").trim().toLowerCase();

    if (!firstName && !lastName) return "";
    if (!firstName) return lastName;
    if (!lastName) return firstName;

    return `${firstName}.${lastName}`;
  };

  const openCreateModal = () => {
    setCreatedAdmin(null);
    addForm.resetFields();
    setIsAdminUserNameCustomized(false);
    setModalOpen(true);
  };

  const closeCreateModal = () => {
    addForm.resetFields();
    setIsAdminUserNameCustomized(false);
    setModalOpen(false);
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
          adminUserName: String(values.adminUserName ?? "").trim().toLowerCase(),
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
        setIsAdminUserNameCustomized(false);
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
      render: (text) => (
        <Space>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(22,119,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1677ff",
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {text.charAt(0).toUpperCase()}
          </div>
          <strong>{text}</strong>
        </Space>
      ),
    },
    {
      title: t("colSeats"),
      dataIndex: "purchasedUsers",
      key: "purchasedUsers",
      width: 90,
      align: "center" as const,
      render: (val) => <Text>{val}</Text>,
    },
    {
      title: t("colStatus"),
      dataIndex: "isActive",
      key: "isActive",
      width: 110,
      align: "center" as const,
      render: (val) => (
        <Tag color={val ? "success" : "error"}>{val ? t("statusActive") : t("statusInactive")}</Tag>
      ),
    },
    {
      title: t("colCreated"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 110,
      responsive: ["sm"],
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 120,
      align: "center" as const,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title={t("edit")}>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); router.push(`/super-admin/tenants/${record._id}`); }}
            />
          </Tooltip>
          <Tooltip title={t("manageUsers")}>
            <Button
              size="small"
              icon={<TeamOutlined />}
              onClick={(e) => { e.stopPropagation(); router.push(`/super-admin/tenants/${record._id}/users`); }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (status === "loading") return null;
  if ((session?.user as any)?.role !== "super_admin") return null;

  return (
    <div style={{ minHeight: "100vh", padding: "clamp(12px, 3vw, 28px)" }}>
      {contextHolder}
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>

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
                onClick={openCreateModal}
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

        </div>
      </div>

      <Modal
        open={modalOpen}
        title={t("tenantsTitle")}
        onCancel={closeCreateModal}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={addForm}
          onFinish={handleAddTenant}
          onValuesChange={(changedValues, allValues) => {
            if (Object.prototype.hasOwnProperty.call(changedValues, "adminUserName")) {
              setIsAdminUserNameCustomized(true);
              return;
            }

            if (
              !isAdminUserNameCustomized &&
              (Object.prototype.hasOwnProperty.call(changedValues, "adminName") ||
                Object.prototype.hasOwnProperty.call(changedValues, "adminLastname"))
            ) {
              addForm.setFieldValue(
                "adminUserName",
                generateUserName(allValues.adminName, allValues.adminLastname),
              );
            }
          }}
          layout="vertical"
          initialValues={{ purchasedUsers: 1, adminUserName: "" }}
        >
          <Form.Item
            name="name"
            label={t("tenantName")}
            rules={[{ required: true, message: t("required") }]}
          >
            <Input placeholder={t("tenantNamePlaceholder")} />
          </Form.Item>
          <Form.Item name="purchasedUsers" label={t("seats")}>
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
            name="adminUserName"
            label={t("adminUsername")}
            rules={[{ required: true, message: t("required") }]}
            normalize={(value) => String(value ?? "").trim().toLowerCase()}
          >
            <Input addonBefore="@" placeholder="first.last" autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="adminPassword"
            label={t("adminPassword")}
            rules={[{ required: true, min: 6, message: t("adminPasswordMin") }]}
          >
            <Input.Password placeholder={t("adminPasswordPlaceholder")} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t("confirmPassword")}
            dependencies={["adminPassword"]}
            rules={[
              { required: true, message: t("required") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("adminPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t("passwordMismatch")));
                },
              }),
            ]}
          >
            <Input.Password
              placeholder={t("confirmPasswordPlaceholder")}
              autoComplete="new-password"
            />
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
