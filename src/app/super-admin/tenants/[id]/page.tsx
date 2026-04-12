"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Space,
  Spin,
  message,
  Tag,
  Modal,
} from "antd";
import { SaveOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import BackButton from "@/components/BackButton";
import { useNavigateUp } from "@/hooks/useNavigateUp";

type AdminUser = {
  id: string;
  name: string;
  lastname: string;
  userName: string;
  role: string;
};

type Tenant = {
  _id: string;
  name: string;
  purchasedUsers: number;
  isActive: boolean;
  createdAt: string;
  adminUser: AdminUser | null;
};

export default function TenantDetailPage() {
  const t = useTranslations("superAdmin");
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const goUp = useNavigateUp();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any).role !== "super_admin") {
      router.replace("/welcomePage");
    }
  }, [session, status, router]);

  useEffect(() => {
    if ((session?.user as any)?.role !== "super_admin" || !id) return;
    fetchTenant();
  }, [session, id]);

  const fetchTenant = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`);
      if (!res.ok) {
        messageApi.error(t("loadError"));
        return;
      }
      const data: Tenant = await res.json();
      setTenant(data);
      form.setFieldsValue({
        name: data.name,
        purchasedUsers: data.purchasedUsers,
        isActive: data.isActive,
      });
    } catch {
      messageApi.error(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        const updated: Tenant = await res.json();
        setTenant(updated);
        messageApi.success(t("updateSuccess"));
      } else {
        const data = await res.json();
        messageApi.error(data.error ?? t("updateError"));
      }
    } catch {
      messageApi.error(t("updateError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!tenant || deleteConfirmName !== tenant.name) {
      message.error(t("deleteConfirmMismatch"));
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
      if (res.ok) {
        messageApi.success(t("deleteSuccess"));
        setDeleteModalOpen(false);
        router.push("/super-admin/tenants");
      } else {
        const data = await res.json();
        messageApi.error(data.error ?? t("deleteError"));
      }
    } catch {
      messageApi.error(t("networkErrorGeneric"));
    } finally {
      setDeleting(false);
    }
  };

  if (status === "loading") return null;
  if ((session?.user as any)?.role !== "super_admin") return null;

  return (
    <div style={{ minHeight: "100vh", padding: "24px" }}>
      {contextHolder}
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>

          <BackButton onClick={goUp}>{t("back")}</BackButton>

          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: "22px", fontWeight: "bold" }}>
                  🏢 {tenant?.name ?? "…"}
                </span>
                {tenant && (
                  <Tag color={tenant.isActive ? "success" : "error"}>
                    {tenant.isActive ? t("statusActive") : t("statusInactive")}
                  </Tag>
                )}
              </div>
            }
            style={{ borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
          >
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Spin size="large" />
              </div>
            ) : (
              <Form form={form} layout="vertical" onFinish={handleSave}>
                <Form.Item
                  name="name"
                  label={t("tenantName")}
                  rules={[{ required: true, message: t("required") }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  name="purchasedUsers"
                  label={t("seats")}
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item
                  name="isActive"
                  label={t("colStatus")}
                  valuePropName="checked"
                >
                  <Switch
                    checkedChildren={t("statusActive")}
                    unCheckedChildren={t("statusInactive")}
                  />
                </Form.Item>

                {tenant && (
                  <div style={{ marginBottom: 16, fontSize: "0.85rem" }}>
                    <div style={{ color: "var(--color-text-secondary, #888)", marginBottom: 12 }}>
                      <div>ID: <code>{tenant._id}</code></div>
                      <div>{t("colCreated")}: {new Date(tenant.createdAt).toLocaleDateString()}</div>
                    </div>
                    {tenant.adminUser ? (
                      <Card size="small" style={{ background: "rgba(22,119,255,0.04)", borderColor: "rgba(22,119,255,0.2)" }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>👤 Admin</div>
                        <div><strong>{tenant.adminUser.name} {tenant.adminUser.lastname}</strong></div>
                        <div style={{ color: "#888" }}>@{tenant.adminUser.userName}</div>
                        <div style={{ color: "#888" }}>ID: <code>{tenant.adminUser.id}</code></div>
                      </Card>
                    ) : (
                      <div style={{ color: "#888" }}>No admin user found</div>
                    )}
                  </div>
                )}

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={saving}
                      block
                    >
                      {t("save")}
                    </Button>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      block
                      onClick={() => { setDeleteConfirmName(""); setDeleteModalOpen(true); }}
                    >
                      {t("delete")}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            )}
          </Card>

        </Space>
      </div>

      <Modal
        open={deleteModalOpen}
        title={tenant ? t("deleteConfirmTitle", { name: tenant.name }) : ""}
        onCancel={() => setDeleteModalOpen(false)}
        onOk={handleDeleteConfirm}
        okText={t("deleteOkText")}
        okButtonProps={{ danger: true, loading: deleting, disabled: deleteConfirmName !== (tenant?.name ?? "") }}
        cancelText={t("cancel")}
        destroyOnClose
      >
        <p>{t("deleteConfirmContent")}</p>
        <p style={{ marginBottom: 8 }}><strong>{t("deleteConfirmTypeLabel")}</strong></p>
        <Input
          value={deleteConfirmName}
          onChange={(e) => setDeleteConfirmName(e.target.value)}
          placeholder={tenant?.name}
        />
      </Modal>
    </div>
  );
}
