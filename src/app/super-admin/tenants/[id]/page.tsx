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
  Select,
  Upload,
  Avatar,
} from "antd";
import {
  SaveOutlined,
  UploadOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
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
  slug?: string;
  logo?: string;
  ownerUserId?: string;
  purchasedUsers: number;
  plan?: string;
  status?: string;
  trialEndsAt?: string;
  maxUsers?: number;
  maxProducts?: number;
  features?: { advancedReports: boolean; multiBranch: boolean };
  contactEmail?: string;
  phone?: string;
  address?: { city?: string; street?: string };
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
  const [logoUploading, setLogoUploading] = useState(false);

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
        slug: data.slug ?? "",
        ownerUserId: data.ownerUserId ?? "",
        purchasedUsers: data.purchasedUsers,
        plan: data.plan ?? "free",
        status: data.status ?? "active",
        trialEndsAt: data.trialEndsAt ? data.trialEndsAt.slice(0, 10) : "",
        maxUsers: data.maxUsers,
        maxProducts: data.maxProducts,
        advancedReports: data.features?.advancedReports ?? false,
        multiBranch: data.features?.multiBranch ?? false,
        contactEmail: data.contactEmail ?? "",
        phone: data.phone ?? "",
        city: data.address?.city ?? "",
        street: data.address?.street ?? "",
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
      // Reshape flat form fields into nested structure expected by the API
      const body: Record<string, unknown> = {
        name: values.name,
        slug: values.slug || undefined,
        ownerUserId: values.ownerUserId || undefined,
        purchasedUsers: values.purchasedUsers,
        plan: values.plan,
        status: values.status,
        trialEndsAt: values.trialEndsAt || undefined,
        maxUsers: values.maxUsers || undefined,
        maxProducts: values.maxProducts || undefined,
        features: {
          advancedReports: values.advancedReports ?? false,
          multiBranch: values.multiBranch ?? false,
        },
        contactEmail: values.contactEmail || undefined,
        phone: values.phone || undefined,
        address: {
          city: values.city || undefined,
          street: values.street || undefined,
        },
        isActive: values.isActive,
      };

      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(`/api/admin/tenants/${id}/logo`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setTenant((prev) => prev ? { ...prev, logo: data.logo } : prev);
        messageApi.success(t("logoUpdated"));
      } else {
        const data = await res.json();
        messageApi.error(data.error ?? t("logoUploadError"));
      }
    } catch {
      messageApi.error(t("logoUploadError"));
    } finally {
      setLogoUploading(false);
    }
    return false; // prevent antd default upload
  };


  if (status === "loading") return null;
  if ((session?.user as any)?.role !== "super_admin") return null;

  return (
    <div style={{ minHeight: "100vh", padding: "24px" }}>
      {contextHolder}
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
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

                {/* Logo */}
                <Form.Item label={t("logo")}>
                  <Space align="center">
                    <Avatar
                      size={64}
                      src={tenant?.logo ?? undefined}
                      icon={!tenant?.logo ? <UserOutlined /> : undefined}
                    />
                    <Upload
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      showUploadList={false}
                      beforeUpload={handleLogoUpload}
                    >
                      <Button icon={<UploadOutlined />} loading={logoUploading}>
                        {t("uploadLogo")}
                      </Button>
                    </Upload>
                  </Space>
                </Form.Item>

                <Form.Item name="name" label={t("tenantName")} rules={[{ required: true, message: t("required") }]}>
                  <Input />
                </Form.Item>

                <Form.Item name="slug" label={t("slug")}>
                  <Input placeholder={t("slugPlaceholder")} />
                </Form.Item>

                <Form.Item name="contactEmail" label={t("contactEmail")} rules={[{ type: "email", message: t("required") }]}>
                  <Input />
                </Form.Item>

                <Form.Item name="phone" label={t("phone")}>
                  <Input />
                </Form.Item>

                <Form.Item label={t("address")}>
                  <Space.Compact style={{ width: "100%" }}>
                    <Form.Item name="city" noStyle>
                      <Input placeholder={t("city")} style={{ width: "50%" }} />
                    </Form.Item>
                    <Form.Item name="street" noStyle>
                      <Input placeholder={t("street")} style={{ width: "50%" }} />
                    </Form.Item>
                  </Space.Compact>
                </Form.Item>

                <Form.Item name="plan" label={t("plan")}>
                  <Select options={[
                    { value: "free", label: t("planFree") },
                    { value: "starter", label: t("planStarter") },
                    { value: "pro", label: t("planPro") },
                    { value: "enterprise", label: t("planEnterprise") },
                  ]} />
                </Form.Item>

                <Form.Item name="status" label={t("accountStatus")}>
                  <Select options={[
                    { value: "active", label: t("statusActive") },
                    { value: "suspended", label: t("statusSuspended") },
                    { value: "cancelled", label: t("statusCancelled") },
                  ]} />
                </Form.Item>

                <Form.Item name="trialEndsAt" label={t("trialEndsAt")}>
                  <Input type="date" />
                </Form.Item>

                <Form.Item name="purchasedUsers" label={t("seats")} rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item name="maxUsers" label={t("maxUsers")}>
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item name="maxProducts" label={t("maxProducts")}>
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>

                <Card size="small" title={t("features")} style={{ marginBottom: 16 }}>
                  <Form.Item name="advancedReports" label={t("advancedReports")} valuePropName="checked" style={{ marginBottom: 8 }}>
                    <Switch />
                  </Form.Item>
                  <Form.Item name="multiBranch" label={t("multiBranch")} valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch />
                  </Form.Item>
                </Card>

                <Form.Item name="isActive" label={t("colStatus")} valuePropName="checked">
                  <Switch checkedChildren={t("statusActive")} unCheckedChildren={t("statusInactive")} />
                </Form.Item>

                {tenant && (
                  <div style={{ marginBottom: 16, fontSize: "0.85rem" }}>
                    <div style={{ color: "var(--color-text-secondary, #888)", marginBottom: 12 }}>
                      <div>ID: <code>{tenant._id}</code></div>
                      <div>{t("colCreated")}: {new Date(tenant.createdAt).toLocaleDateString()}</div>
                    </div>
                    {tenant.adminUser ? (
                      <Card size="small" style={{ background: "rgba(22,119,255,0.04)", borderColor: "rgba(22,119,255,0.2)", marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>👤 Admin</div>
                        <div><strong>{tenant.adminUser.name} {tenant.adminUser.lastname}</strong></div>
                        <div style={{ color: "#888" }}>@{tenant.adminUser.userName}</div>
                        <div style={{ color: "#888" }}>ID: <code>{tenant.adminUser.id}</code></div>
                      </Card>
                    ) : (
                      <div style={{ color: "#888", marginBottom: 12 }}>No admin user found</div>
                    )}
                    <Button
                      icon={<TeamOutlined />}
                      onClick={() => router.push(`/super-admin/tenants/${id}/users`)}
                      block
                      style={{ marginBottom: 8 }}
                    >
                      {t("manageUsers")}
                    </Button>
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
                  </Space>
                </Form.Item>
              </Form>
            )}
          </Card>

        </Space>
      </div>
    </div>
  );
}
