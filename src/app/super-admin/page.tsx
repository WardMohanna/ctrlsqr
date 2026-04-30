"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, Row, Col, Typography } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";

const { Title, Text } = Typography;

export default function SuperAdminPage() {
  const t = useTranslations("superAdmin");
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any).role !== "super_admin") {
      router.replace("/welcomePage");
    }
  }, [session, status, router]);

  if (status === "loading") return null;
  if ((session?.user as any)?.role !== "super_admin") return null;

  const menuItems = [
    {
      title: t("tenantsTitle"),
      description: t("tenantsDescription"),
      icon: <TeamOutlined style={{ fontSize: "36px" }} />,
      path: "/super-admin/tenants",
      color: "#1677ff",
      bgColor: "rgba(22, 119, 255, 0.1)",
    },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
        padding: "clamp(10px, 3.5vw, 24px)",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)",
            backdropFilter: "blur(20px)",
            borderRadius: "20px",
            padding: "clamp(16px, 5.5vw, 40px)",
            marginBottom: "32px",
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        >
          <Title
            level={2}
            style={{ color: "#fff", margin: 0, fontWeight: 700, textShadow: "0 2px 10px rgba(0,0,0,0.2)" }}
          >
            🏢 {t("dashboardTitle")}
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.95)", fontSize: "16px", marginTop: "12px", display: "block" }}>
            {t("dashboardWelcome")}
          </Text>
        </div>

        {/* Cards */}
        <Row gutter={[20, 20]}>
          {menuItems.map((item) => (
            <Col key={item.path} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                onClick={() => router.push(item.path)}
                style={{
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background:
                    theme === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: item.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
                <Title level={4} style={{ margin: "0 0 8px", fontWeight: 600 }}>
                  {item.title}
                </Title>
                <Text type="secondary" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                  {item.description}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
}
