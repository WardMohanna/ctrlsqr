"use client";

import { useRouter } from "next/navigation";
import { Card, Row, Col, Typography, Breadcrumb } from "antd";
import { TeamOutlined, BarChartOutlined, DashboardOutlined, HomeOutlined, SettingOutlined, FileTextOutlined } from "@ant-design/icons";
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
      title: t("reviewEmployeeReports"),
      description: t("reviewEmployeeReportsDescription"),
      icon: <FileTextOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/review-reports",
      color: "#13c2c2",
      bgColor: "rgba(19, 194, 194, 0.1)",
    },
    {
      title: t("dailyProductionReport"),
      description: t("dailyProductionReportDescription"),
      icon: <FileTextOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/daily-report",
      color: "#fa8c16",
      bgColor: "rgba(250, 140, 22, 0.1)",
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
            { href: "/", title: <HomeOutlined style={{ color: "#fff" }} /> },
            { title: <><SettingOutlined style={{ marginInlineEnd: 4, color: "#fff" }} /><span style={{ color: "#fff" }}>{t("pageTitle")}</span></> },
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
            {t("pageTitle")}
          </Title>
          <Text style={{ color: "rgba(255, 255, 255, 0.95)", fontSize: "16px", marginTop: "12px", display: "block", textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)" }}>
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
