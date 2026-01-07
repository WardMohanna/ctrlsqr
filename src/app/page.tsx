"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Alert, Space, Typography } from "antd";
import { UserOutlined, LockOutlined, LoginOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (session?.user) {
      router.push("/welcomePage");
    }
  }, [session, router]);

  const handleLogin = async (values: { username: string; password: string }) => {
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      username: values.username,
      password: values.password,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid username or password.");
    }
  };

  if (!isMounted) return null;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
      }}
    >
      <Card
        style={{
          maxWidth: "420px",
          width: "100%",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Title level={2} style={{ marginBottom: "8px" }}>
              ברוכים הבאים
            </Title>
            <Text type="secondary">אנא התחבר לחשבונך</Text>
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
              rules={[
                { required: true, message: "נא להזין שם משתמש" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="שם משתמש"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "נא להזין סיסמה" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="סיסמה"
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
                התחבר
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
