"use client";

import { useRouter } from "next/navigation";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTheme } from "@/hooks/useTheme";
import { useTranslations } from "next-intl";
import BackButton from "@/components/BackButton";
import { Card, Row, Col, Typography, Breadcrumb } from "antd";
import {
  TeamOutlined,
  FileTextOutlined,
  BarChartOutlined,
  DashboardOutlined,
  SettingOutlined,
  HomeOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function ManagerDashboardHome() {
  const router = useRouter();
  const goUp = useNavigateUp();
  const t = useTranslations("manager");
  const { theme } = useTheme();

  const menuItems = [
    {
      title: t("manageUsers"),
      description: t("manageUsersDescription"),
      icon: <TeamOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/userManagment",
      color: "#1677ff",
      bgColor: "rgba(22, 119, 255, 0.12)",
    },
    {
      title: t("reviewEmployeeReports"),
      description: t("reviewEmployeeReportsDescription"),
      icon: <FileTextOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/review-reports",
      color: "#13c2c2",
      bgColor: "rgba(19, 194, 194, 0.12)",
    },
    {
      title: t("dailyProductionReport"),
      description: t("dailyProductionReportDescription"),
      icon: <FileTextOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/daily-report",
      color: "#fa8c16",
      bgColor: "rgba(250, 140, 22, 0.12)",
    },
    {
      title: t("viewReports"),
      description: t("viewReportsDescription"),
      icon: <BarChartOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/reports",
      color: "#52c41a",
      bgColor: "rgba(82, 196, 26, 0.12)",
    },
    {
      title: t("dashboardView"),
      description: t("dashboardDescription"),
      icon: <DashboardOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/dashboard",
      color: "#722ed1",
      bgColor: "rgba(114, 46, 209, 0.12)",
    },
    {
      title: t("settings"),
      description: t("settingsDescription"),
      icon: <SettingOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/settings",
      color: "#fa541c",
      bgColor: "rgba(250, 84, 28, 0.12)",
    },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "16px" }}>
          <BackButton onClick={goUp}>{t("back")}</BackButton>
        </div>

        <Breadcrumb
          style={{
            marginBottom: "24px",
            padding: "8px 16px",
            background: theme === "dark" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.55)",
            borderRadius: 8,
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(8px)",
          }}
          items={[
            { href: "/", title: <HomeOutlined /> },
            { title: t("pageTitle") },
          ]}
        />

        <div
          style={{
            padding: "32px",
            borderRadius: "20px",
            background: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: theme === "dark" ? "0 10px 30px rgba(0,0,0,0.45)" : "0 10px 30px rgba(0,0,0,0.1)",
          }}
        >
          <Title
            level={2}
            style={{
              color: theme === "dark" ? "#fff" : "#111827",
              marginBottom: 8,
            }}
          >
            {t("pageTitle")}
          </Title>
          <Text style={{ color: theme === "dark" ? "#dbe4ff" : "#4a5568" }}>
            {t("welcomeMessage")}
          </Text>

          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            {menuItems.map((item, index) => (
              <Col key={index} xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  onClick={() => router.push(item.path)}
                  style={{
                    borderRadius: 16,
                    cursor: "pointer",
                    height: 240,
                    border: theme === "dark" ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
                    background: theme === "dark" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.9)",
                  }}
                  bodyStyle={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    height: "100%",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: item.bgColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: item.color,
                      marginBottom: 12,
                    }}
                  >
                    {item.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <Title
                      level={4}
                      style={{
                        margin: 0,
                        color: theme === "dark" ? "#ffffff" : "#0f172a",
                      }}
                    >
                      {item.title}
                    </Title>
                    <Text
                      style={{
                        color: theme === "dark" ? "#dbe4ff" : "#4a5568",
                      }}
                    >
                      {item.description}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    </div>
  );
}

