"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Card, Typography, Row, Col, Avatar, Tag, Spin, Button } from "antd";
import { UserOutlined, IdcardOutlined, SafetyOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tMain = useTranslations("main");
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "24px",
        }}
      >
        <Card style={{ maxWidth: "520px", width: "100%", textAlign: "center", borderRadius: "16px" }}>
          <Title level={3}>{t("notSignedInTitle")}</Title>
          <Text>{t("notSignedInDescription")}</Text>
          <div style={{ marginTop: "20px" }}>
            <Button type="primary" onClick={() => router.push("/")}>{tMain("home")}</Button>
          </div>
        </Card>
      </div>
    );
  }

  const userFirstName = session.user.name || t("unknown");
  const userLastName = (session.user as { lastname?: string })?.lastname || t("unknown");
  const fullName = `${userFirstName} ${userLastName}`.trim();
  const userRole = (session.user as any)?.role || t("unknown");
  const userId = (session.user as any)?.id || t("unknown");

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "920px", margin: "0 auto" }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)",
            backdropFilter: "blur(20px)",
            borderRadius: "20px",
            padding: "32px",
            marginBottom: "24px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <Title level={2} style={{ color: "#fff", margin: 0 }}>
            {t("title")}
          </Title>
          <Text style={{ color: "rgba(255, 255, 255, 0.95)", marginTop: "10px", display: "block" }}>
            {t("subtitle")}
          </Text>
        </div>

        <Card
          style={{
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
          }}
          styles={{ body: { padding: "28px" } }}
        >
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} md={8} style={{ textAlign: "center" }}>
              <Avatar size={96} icon={<UserOutlined />} style={{ backgroundColor: "#1677ff" }} />
              <Title level={4} style={{ marginTop: "14px", marginBottom: 0 }}>{fullName}</Title>
              <Tag color="blue" style={{ marginTop: "10px", textTransform: "capitalize" }}>{userRole}</Tag>
            </Col>

            <Col xs={24} md={16}>
              <div style={{ display: "grid", gap: "16px" }}>
                <Card size="small">
                  <Text type="secondary">
                    <UserOutlined style={{ marginInlineEnd: 8 }} />
                    {t("name")}
                  </Text>
                  <div style={{ marginTop: "4px", fontSize: "16px", fontWeight: 600 }}>{fullName}</div>
                </Card>

                <Card size="small">
                  <Text type="secondary">
                    <SafetyOutlined style={{ marginInlineEnd: 8 }} />
                    {t("role")}
                  </Text>
                  <div style={{ marginTop: "4px", fontSize: "16px", fontWeight: 600, textTransform: "capitalize" }}>
                    {userRole}
                  </div>
                </Card>

                <Card size="small">
                  <Text type="secondary">
                    <IdcardOutlined style={{ marginInlineEnd: 8 }} />
                    {t("userId")}
                  </Text>
                  <div style={{ marginTop: "4px", fontSize: "16px", fontWeight: 600, wordBreak: "break-all" }}>
                    {userId}
                  </div>
                </Card>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
}
