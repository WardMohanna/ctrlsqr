"use client";

import { useRouter } from "next/navigation";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTheme } from "@/hooks/useTheme";
import BackButton from "@/components/BackButton";
import { Card, Row, Col, Typography, Breadcrumb, Alert, Badge } from "antd";
import {
  TeamOutlined,
  BarChartOutlined,
  DashboardOutlined,
  HomeOutlined,
  SettingOutlined,
  FileTextOutlined,
  HistoryOutlined,
  ArrowUpOutlined,
  WarningOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
  DiffOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

const { Title, Text } = Typography;

export default function ManagerDashboardHome() {
  const router = useRouter();
  const goUp = useNavigateUp();
  const t = useTranslations("manager");
  const { theme } = useTheme();
  const [priceAlertCount, setPriceAlertCount] = useState(0);

  useEffect(() => {
    fetch("/api/manager/price-increases?acknowledged=false")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setPriceAlertCount(d.unacknowledgedCount ?? 0); })
      .catch(() => {});
  }, []);

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
      title: t("dashboardView"),
      description: t("dashboardDescription"),
      icon: <DashboardOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/dashboard",
      color: "#722ed1",
      bgColor: "rgba(114, 46, 209, 0.1)",
    },
    {
      title: t("activityArchiveTitle"),
      description: t("activityArchiveDescription"),
      icon: <HistoryOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/activity-archive",
      color: "#eb2f96",
      bgColor: "rgba(235, 47, 150, 0.1)",
    },
    {
      title: t("suppliersReport"),
      description: t("suppliersReportDescription"),
      icon: <BarChartOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/supplier-report",
      color: "#fa541c",
      bgColor: "rgba(250, 84, 28, 0.1)",
    },
    {
      title: t("priceIncreasesTitle"),
      description: t("priceIncreasesDescription"),
      icon: <ArrowUpOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/price-increases",
      color: "#cf1322",
      bgColor: "rgba(207, 19, 34, 0.1)",
      badge: priceAlertCount,
    },
    {
      title: t("foodCostReportTitle"),
      description: t("foodCostReportDescription"),
      icon: <ExperimentOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/food-cost-report",
      color: "#fa541c",
      bgColor: "rgba(250, 84, 28, 0.1)",
    },
    {
      title: t("actualFoodCostTitle"),
      description: t("actualFoodCostDescription"),
      icon: <DatabaseOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/actual-food-cost",
      color: "#13c2c2",
      bgColor: "rgba(19, 194, 194, 0.1)",
    },
    {
      title: t("foodCostDiffTitle"),
      description: t("foodCostDiffDescription"),
      icon: <DiffOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/food-cost-diff",
      color: "#722ed1",
      bgColor: "rgba(114, 46, 209, 0.1)",
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
        <div style={{ marginBottom: "16px" }}>
          <BackButton onClick={goUp}>{t("back")}</BackButton>
        </div>

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
            {
              title: (
                <>
                  <SettingOutlined
                    style={{ marginInlineEnd: 4, color: "#fff" }}
                  />
                  <span style={{ color: "#fff" }}>{t("pageTitle")}</span>
                </>
              ),
            },
          ]}
        />

        {/* Header Section */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)",
            backdropFilter: "blur(20px)",
            borderRadius: "20px",
            padding: "clamp(16px, 5.5vw, 40px)",
            marginBottom: "32px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Title
            level={2}
            style={{
              color: "#fff",
              margin: 0,
              fontWeight: 700,
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
            }}
          >
            {t("pageTitle")}
          </Title>
          <Text
            style={{
              color: "rgba(255, 255, 255, 0.95)",
              fontSize: "16px",
              marginTop: "12px",
              display: "block",
              textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
            }}
          >
            {t("welcomeMessage")}
          </Text>
        </div>

        {/* Notification banner */}
        {priceAlertCount > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message={t("priceIncreaseAlert", { count: priceAlertCount })}
            style={{ marginBottom: 16, borderRadius: 8, cursor: "pointer" }}
            onClick={() => router.push("/manager/price-increases")}
          />
        )}

        {/* Cards Grid */}
        <Row
          gutter={[
            { xs: 8, sm: 16, lg: 24 },
            { xs: 8, sm: 16, lg: 24 },
          ]}
        >
          {menuItems.map((item: any, index) => (
            <Col key={index} xs={12} sm={12} lg={8}>
              <Badge count={item.badge || 0} offset={[-12, 12]}>
              <Card
                hoverable
                onClick={() => router.push(item.path)}
                data-return-path={item.path}
                style={{
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(10px)",
                  height: "clamp(156px, 41vw, 220px)",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
                }}
                styles={{
                  body: {
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    padding: "clamp(10px, 2.9vw, 28px)",
                  },
                }}
                onMouseEnter={(e) => {
                  if (
                    typeof window !== "undefined" &&
                    window.matchMedia("(hover: none), (pointer: coarse)")
                      .matches
                  ) {
                    return;
                  }
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(0, 0, 0, 0.15)";
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.4)";
                }}
                onMouseLeave={(e) => {
                  if (
                    typeof window !== "undefined" &&
                    window.matchMedia("(hover: none), (pointer: coarse)")
                      .matches
                  ) {
                    return;
                  }
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 10px rgba(0, 0, 0, 0.08)";
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.25)";
                }}
              >
                <div
                  style={{
                    width: "clamp(38px, 9vw, 64px)",
                    height: "clamp(38px, 9vw, 64px)",
                    borderRadius: "16px",
                    background: `linear-gradient(135deg, ${item.color}15 0%, ${item.color}25 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.color,
                    marginBottom: "clamp(8px, 2.2vw, 20px)",
                    border: `2px solid ${item.color}30`,
                    boxShadow: `0 4px 15px ${item.color}20`,
                  }}
                >
                  {item.icon}
                </div>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    marginBottom: "clamp(6px, 1.8vw, 12px)",
                    fontWeight: 700,
                    fontSize: "clamp(14px, 3.2vw, 24px)",
                    color: theme === "dark" ? "#ffffff" : "#1a1a1a",
                  }}
                >
                  {item.title}
                </Title>
                <Text
                  style={{
                    color: theme === "dark" ? "#dbe4ff" : "#4a5568",
                    fontSize: "clamp(11px, 2.5vw, 14px)",
                    lineHeight: 1.45,
                    fontWeight: 500,
                  }}
                >
                  {item.description}
                </Text>
              </Card>
              </Badge>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
}
