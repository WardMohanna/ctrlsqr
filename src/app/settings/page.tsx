"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import BackButton from "@/components/BackButton";
import {
  Card,
  Form,
  Input,
  Tabs,
  Button,
  Avatar,
  Upload,
  Space,
  Spin,
  message,
  Typography,
  Tag,
  Divider,
} from "antd";
import {
  UploadOutlined,
  UserOutlined,
  SaveOutlined,
  ShopOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface TenantData {
  _id: string;
  name: string;
  slug?: string;
  logo?: string;
  plan?: string;
  status?: string;
  contactEmail?: string;
  phone?: string;
  address?: { city?: string; street?: string };
  maxUsers?: number;
  maxProducts?: number;
  features?: { advancedReports: boolean; multiBranch: boolean };
  trialEndsAt?: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const goUp = useNavigateUp();
  const t = useTranslations("settings");
  const { theme } = useTheme();

  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "loading") return;
    if (!session || role !== "admin") {
      router.replace("/welcomePage");
    }
  }, [session, status, role, router]);

  useEffect(() => {
    if (status !== "authenticated" || role !== "admin") return;
    fetch("/api/settings/tenant")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setTenant(data);
          form.setFieldsValue({
            contactEmail: data.contactEmail ?? "",
            phone: data.phone ?? "",
            city: data.address?.city ?? "",
            street: data.address?.street ?? "",
          });
        }
      })
      .catch(() => messageApi.error(t("loadError")))
      .finally(() => setLoading(false));
  }, [status, role]);

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const body = {
        contactEmail: values.contactEmail || undefined,
        phone: values.phone || undefined,
        address: {
          city: values.city || undefined,
          street: values.street || undefined,
        },
      };
      const res = await fetch("/api/settings/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
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
      const res = await fetch("/api/settings/tenant/logo", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setTenant((prev) => (prev ? { ...prev, logo: data.logo } : prev));
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
    return false;
  };

  const handleLogoRemove = async () => {
    try {
      const res = await fetch("/api/settings/tenant/logo", { method: "DELETE" });
      if (res.ok) {
        setTenant((prev) => (prev ? { ...prev, logo: undefined } : prev));
        messageApi.success(t("logoRemoved"));
      }
    } catch {
      messageApi.error(t("logoUploadError"));
    }
  };

  // Only admins reach this point

  const bg = theme === "dark" ? "#1f1f1f" : "#f5f7fa";
  const cardBg = theme === "dark" ? "#2d2d2d" : "#ffffff";

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!tenant) return null;

  const tenantInfoTab = (
    <div>
      {/* Read-only info */}
      <Card
        size="small"
        style={{ background: theme === "dark" ? "#1a2744" : "#f0f5ff", marginBottom: 20, borderColor: "#1677ff33" }}
      >
        <Space direction="vertical" size={4}>
          <Space>
            <Text strong>{t("tenantName")}:</Text>
            <Text>{tenant.name}</Text>
          </Space>
          <Space>
            <Text strong>{t("plan")}:</Text>
            <Tag color="blue">{tenant.plan ?? "free"}</Tag>
          </Space>
          {tenant.maxUsers && (
            <Space>
              <Text strong>{t("maxUsers")}:</Text>
              <Text>{tenant.maxUsers}</Text>
            </Space>
          )}
          {tenant.trialEndsAt && (
            <Space>
              <Text strong>{t("trialEndsAt")}:</Text>
              <Text>{new Date(tenant.trialEndsAt).toLocaleDateString()}</Text>
            </Space>
          )}
        </Space>
      </Card>

      {/* Logo */}
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: "block", marginBottom: 8 }}>{t("logo")}</Text>
        <Space align="center">
          <Avatar
            size={72}
            src={tenant.logo ?? undefined}
            icon={!tenant.logo ? <UserOutlined /> : undefined}
            style={{ border: "2px solid #1677ff33" }}
          />
          <Space direction="vertical" size={4}>
              <Upload
                accept="image/jpeg,image/png,image/webp,image/gif"
                showUploadList={false}
                beforeUpload={handleLogoUpload}
              >
                <Button icon={<UploadOutlined />} loading={logoUploading} size="small">
                  {t("uploadLogo")}
                </Button>
              </Upload>
              {tenant.logo && (
                <Button danger size="small" onClick={handleLogoRemove}>
                  {t("removeLogo")}
                </Button>
              )}
            </Space>
        </Space>
      </div>

      <Divider />

      {/* Editable fields */}
      <Form form={form} layout="vertical" onFinish={handleSave}>


          <Form.Item
            name="contactEmail"
            label={t("contactEmail")}
            rules={[{ type: "email", message: t("invalidEmail") }]}
          >
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

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} block>
              {t("save")}
            </Button>
          </Form.Item>
        </Form>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "24px" }}>
      {contextHolder}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <BackButton onClick={goUp}>{t("back")}</BackButton>

        <Card
          style={{ marginTop: 16, background: cardBg, borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
          title={
            <Space>
              <ShopOutlined style={{ fontSize: 20, color: "#1677ff" }} />
              <Title level={4} style={{ margin: 0 }}>{t("pageTitle")}</Title>
            </Space>
          }
        >
          <Tabs
            defaultActiveKey="tenant"
            items={[
              {
                key: "tenant",
                label: (
                  <Space>
                    <InfoCircleOutlined />
                    {t("tabCompanyDetails")}
                  </Space>
                ),
                children: tenantInfoTab,
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
