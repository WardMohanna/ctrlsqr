"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Card,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Space,
  Typography,
  Spin,
  Tooltip,
} from "antd";
import {
  LockOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";

const { Title, Text } = Typography;

type TenantUser = {
  id: string;
  name: string;
  lastname: string;
  userName: string;
  role: string;
  isActive: boolean;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "blue",
  user: "default",
  employee: "purple",
  super_admin: "red",
};

export default function TenantUsersPage() {
  const t = useTranslations("superAdmin");
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { theme } = useTheme();

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<TenantUser | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const [passwordForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any).role !== "super_admin") {
      router.replace("/welcomePage");
    }
  }, [session, status, router]);

  useEffect(() => {
    if ((session?.user as any)?.role !== "super_admin" || !id) return;
    fetchTenantName();
    fetchUsers();
  }, [session, id]);

  const fetchTenantName = async () => {
    try {
      const res = await fetch(`/api/admin/tenants/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTenantName(data.name ?? "");
      }
    } catch {
      // non-critical
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        messageApi.error(t("loadError"));
      }
    } catch {
      messageApi.error(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (user: TenantUser) => {
    setTogglingUserId(user.id);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u))
        );
        messageApi.success(
          !user.isActive ? t("userActivated") : t("userDeactivated")
        );
      } else {
        const data = await res.json();
        messageApi.error(data.error ?? t("networkError"));
      }
    } catch {
      messageApi.error(t("networkError"));
    } finally {
      setTogglingUserId(null);
    }
  };

  const openPasswordModal = (user: TenantUser) => {
    setPasswordTarget(user);
    passwordForm.resetFields();
    setPasswordModalOpen(true);
  };

  const handleSetPassword = async (values: { newPassword: string }) => {
    if (!passwordTarget) return;
    setSavingPassword(true);
    try {
      const res = await fetch(
        `/api/admin/tenants/${id}/users/${passwordTarget.id}/password`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: values.newPassword }),
        }
      );
      if (res.ok) {
        messageApi.success(t("passwordSetSuccess"));
        setPasswordModalOpen(false);
      } else {
        const data = await res.json();
        messageApi.error(data.error ?? t("passwordSetError"));
      }
    } catch {
      messageApi.error(t("networkError"));
    } finally {
      setSavingPassword(false);
    }
  };

  const columns: ColumnsType<TenantUser> = [
    {
      title: t("colUser"),
      key: "fullName",
      render: (_, record) => (
        <Space>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(22,119,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1677ff",
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {record.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, lineHeight: 1.3 }}>
              {record.name} {record.lastname}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              @{record.userName}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: t("colRole"),
      dataIndex: "role",
      key: "role",
      width: 120,
      render: (role) => (
        <Tag color={ROLE_COLORS[role] ?? "default"}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </Tag>
      ),
    },
    {
      title: t("colStatus"),
      key: "isActive",
      width: 110,
      render: (_, record) => (
        <Tag
          color={record.isActive ? "success" : "error"}
          icon={record.isActive ? <CheckCircleOutlined /> : <StopOutlined />}
        >
          {record.isActive ? t("statusActive") : t("statusInactive")}
        </Tag>
      ),
    },
    {
      title: t("colActions"),
      key: "actions",
      width: 220,
      render: (_, record) => (
        <Space>
          <Tooltip title={t("setPasswordTooltip")}>
            <Button
              size="small"
              icon={<LockOutlined />}
              onClick={() => openPasswordModal(record)}
            >
              {t("setPassword")}
            </Button>
          </Tooltip>
          <Tooltip title={record.isActive ? t("deactivateUser") : t("activateUser")}>
            <Button
              size="small"
              danger={record.isActive}
              icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
              loading={togglingUserId === record.id}
              onClick={() => toggleUserStatus(record)}
            >
              {record.isActive ? t("deactivate") : t("activate")}
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (status === "loading") return null;
  if ((session?.user as any)?.role !== "super_admin") return null;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: theme === "dark" ? "#1f1f1f" : "#f5f5f5",
        padding: "clamp(12px, 3vw, 28px)",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>

          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/super-admin/tenants/${id}`)}
            style={{ marginBottom: 4 }}
          >
            {t("backToTenant")}
          </Button>

          <Card
            style={{
              borderRadius: 16,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
            title={
              <Space>
                <TeamOutlined style={{ color: "#1677ff" }} />
                <span>
                  {tenantName
                    ? `${tenantName} — ${t("usersTitle")}`
                    : t("usersTitle")}
                </span>
              </Space>
            }
          >
            {loading ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <Spin size="large" />
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                size="middle"
                scroll={{ x: 500 }}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
                locale={{
                  emptyText: (
                    <Space direction="vertical" style={{ padding: "32px 0" }}>
                      <UserOutlined style={{ fontSize: 32, color: "#ccc" }} />
                      <Text type="secondary">{t("noUsers")}</Text>
                    </Space>
                  ),
                }}
              />
            )}
          </Card>
        </Space>
      </div>

      <Modal
        open={passwordModalOpen}
        title={
          <Space>
            <LockOutlined />
            {passwordTarget
              ? t("setPasswordFor", {
                  name: `${passwordTarget.name} ${passwordTarget.lastname}`,
                })
              : t("setPassword")}
          </Space>
        }
        onCancel={() => setPasswordModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 20 }}>
          {t("setPasswordHint")}
        </Text>
        <Form form={passwordForm} layout="vertical" onFinish={handleSetPassword}>
          <Form.Item
            name="newPassword"
            label={t("newPassword")}
            rules={[
              { required: true, message: t("required") },
              { min: 6, message: t("adminPasswordMin") },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t("adminPasswordPlaceholder")}
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t("confirmPassword")}
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: t("required") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t("passwordMismatch")));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t("confirmPasswordPlaceholder")}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setPasswordModalOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="primary" htmlType="submit" loading={savingPassword} icon={<LockOutlined />}>
                {t("setPassword")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
