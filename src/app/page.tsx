"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import {
  Form,
  Input,
  Button,
  Card,
  Alert,
  Space,
  Typography,
  Spin,
} from "antd";
import { UserOutlined, LockOutlined, LoginOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const t = useTranslations("login");

  const getLoginErrorMessage = (errorCode?: string | null) => {
    switch (errorCode) {
      case "LOGIN_MISSING_CREDENTIALS":
        return t("errors.missingCredentials");
      case "LOGIN_USER_NOT_FOUND":
        return t("errors.userNotFound");
      case "LOGIN_INCORRECT_PASSWORD":
        return t("errors.incorrectPassword");
      case "LOGIN_USER_DISABLED":
        return t("errors.userDisabled");
      case "LOGIN_TENANT_DISABLED":
        return t("errors.tenantDisabled");
      case "CredentialsSignin":
        return t("errors.invalidCredentials");
      default:
        return t("errors.default");
    }
  };

  useEffect(() => {
    if (session?.user) {
      if ((session.user as any).role === "super_admin") {
        router.push("/super-admin");
      } else {
        router.push("/welcomePage");
      }
    }
  }, [session, router]);

  const handleLogin = async (values: {
    username: string;
    password: string;
  }) => {
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        username: values.username.trim(),
        password: values.password,
      });

      if (result?.error) {
        setError(getLoginErrorMessage(result.error));
      }
    } catch {
      setError(t("errors.default"));
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking session or redirecting
  if (status === "loading" || session?.user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: theme === "dark" ? "#262626" : "#ffffff",
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
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: theme === "dark" ? "var(--background-color)" : "#ffffff",
        padding: "24px",
      }}
    >
      <Card
        style={{
          maxWidth: "420px",
          width: "100%",
          borderRadius: "12px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Title level={2} style={{ marginBottom: "8px" }}>
              {t("title")}
            </Title>
            <Text type="secondary">{t("subtitle")}</Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: t("usernameRequired") }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t("usernamePlaceholder")}
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: t("passwordRequired") }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t("passwordPlaceholder")}
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                icon={<LoginOutlined />}
              >
                {t("submit")}
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
