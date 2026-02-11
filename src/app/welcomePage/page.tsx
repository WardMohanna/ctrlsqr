"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Card, Row, Col, Typography, Breadcrumb } from "antd";
import { ToolOutlined, TeamOutlined, ShopOutlined, HomeOutlined } from "@ant-design/icons";
import { useEffect } from "react";

const { Title, Text } = Typography;

export default function Main() {
  const router = useRouter();
  const t = useTranslations("main");
  const { data: session } = useSession();
  
  const userRole = (session?.user as any)?.role || 'user';

  // Auto-redirect employees to tasks page
  useEffect(() => {
    if (userRole === 'employee') {
      router.push('/production/tasks');
    }
  }, [userRole, router]);

  // Define menu items based on role
  const allMenuItems = [
    {
      title: t("createProductionTask"),
      description: t("createProductionTaskDesc"),
      icon: <ToolOutlined style={{ fontSize: "36px" }} />,
      color: "#7c3aed",
      bgColor: "rgba(124, 58, 237, 0.1)",
      onClick: () => router.push("/production/tasks/create"),
      roles: ['admin', 'user'], // Not for employees
    },
    {
      title: t("tasks"),
      description: t("tasksDesc"),
      icon: <TeamOutlined style={{ fontSize: "36px" }} />,
      color: "#16a34a",
      bgColor: "rgba(22, 163, 74, 0.1)",
      onClick: () => router.push("/production/tasks"),
      roles: ['admin', 'user', 'employee'], // All roles
    },
    {
      title: t("inventoryModel"),
      description: t("inventoryModelDesc"),
      icon: <ShopOutlined style={{ fontSize: "36px" }} />,
      color: "#1e40af",
      bgColor: "rgba(30, 64, 175, 0.1)",
      onClick: () => router.push("/mainMenu"),
      roles: ['admin', 'user'], // Not for employees
    },
  ];

  // Filter menu items by role
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <Breadcrumb
          style={{ 
            marginBottom: "24px",
            padding: "8px 16px",
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
          items={[
            { title: <><HomeOutlined style={{ marginInlineEnd: 4, color: "#fff" }} /><span style={{ color: "#fff" }}>{t("home")}</span></> },
          ]}
        />

        {/* Header Section */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)",
            backdropFilter: "blur(20px)",
            borderRadius: "20px",
            padding: "40px",
            marginBottom: "32px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Title level={2} style={{ color: "#fff", margin: 0, fontWeight: 700, textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)" }}>
            {t("mainHeading")}
          </Title>
          <Text style={{ color: "rgba(255, 255, 255, 0.95)", fontSize: "16px", marginTop: "12px", display: "block", textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)" }}>
            {t("welcomeDesc")}
          </Text>
        </div>

        {/* Cards Grid */}
        <Row gutter={[24, 24]}>
          {menuItems.map((item, index) => (
            <Col key={index} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                onClick={item.onClick}
                style={{
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(10px)",
                  height: "220px",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                }}
                styles={{
                  body: {
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    padding: "28px",
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "16px",
                    background: `linear-gradient(135deg, ${item.color}15 0%, ${item.color}25 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.color,
                    marginBottom: "20px",
                    border: `2px solid ${item.color}30`,
                    boxShadow: `0 4px 15px ${item.color}20`,
                  }}
                >
                  {item.icon}
                </div>
                <Title level={4} style={{ margin: 0, marginBottom: "12px", fontWeight: 700, color: "#1a1a1a" }}>
                  {item.title}
                </Title>
                <Text style={{ color: "#4a5568", fontSize: "14px", lineHeight: 1.6, fontWeight: 500 }}>
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
