"use client";

import { useRouter } from "next/navigation";
import { Card, Row, Col, Typography, Breadcrumb } from "antd";
import { TeamOutlined, BarChartOutlined, DashboardOutlined, HomeOutlined, SettingOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Title, Text } = Typography;

export default function ManagerDashboardHome() {
  const router = useRouter();
  const t = useTranslations("manager");

  const menuItems = [
    {
      title: t("manageUsers"),
      description: t("manageUsersDescription"),
      icon: <TeamOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/userManagment",
      color: "#1677ff",
      bgColor: "rgba(22, 119, 255, 0.1)",
    },
    {
      title: t("viewReports"),
      description: t("viewReportsDescription"),
      icon: <BarChartOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/reports",
      color: "#52c41a",
      bgColor: "rgba(82, 196, 26, 0.1)",
    },
    {
      title: t("dashboard"),
      description: t("dashboardDescription"),
      icon: <DashboardOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/dashboard",
      color: "#722ed1",
      bgColor: "rgba(114, 46, 209, 0.1)",
    },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "#f5f7fa",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <Breadcrumb
          style={{ marginBottom: "24px" }}
          items={[
            { href: "/", title: <HomeOutlined /> },
            { title: <><SettingOutlined style={{ marginInlineEnd: 4 }} />{t("pageTitle")}</> },
          ]}
        />

        {/* Header Section */}
        <div
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            borderRadius: "16px",
            padding: "32px",
            marginBottom: "32px",
          }}
        >
          <Title level={2} style={{ color: "#fff", margin: 0, fontWeight: 600 }}>
            {t("pageTitle")}
          </Title>
          <Text style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "15px", marginTop: "8px", display: "block" }}>
            {t("welcomeMessage")}
          </Text>
        </div>

        {/* Cards Grid */}
        <Row gutter={[24, 24]}>
          {menuItems.map((item, index) => (
            <Col key={index} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                onClick={() => router.push(item.path)}
                style={{
                  borderRadius: "12px",
                  border: "1px solid #e8e8e8",
                  height: "200px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                styles={{
                  body: {
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    padding: "24px",
                  }
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "12px",
                    background: item.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.color,
                    marginBottom: "16px",
                  }}
                >
                  {item.icon}
                </div>
                <Title level={4} style={{ margin: 0, marginBottom: "8px", fontWeight: 600 }}>
                  {item.title}
                </Title>
                <Text style={{ color: "#666", fontSize: "14px", lineHeight: 1.5 }}>
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
