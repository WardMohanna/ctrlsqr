"use client";

import { useRouter } from "next/navigation";
import { useMemo, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Card, Row, Col, Typography, Breadcrumb, Empty } from "antd";
import { useTheme } from "@/hooks/useTheme";
import {
  ToolOutlined,
  TeamOutlined,
  ShopOutlined,
  HomeOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import {
  getRecentActivities,
  type RecentActivity,
} from "@/lib/recentActivities";

const { Title, Text } = Typography;

export default function Main() {
  const router = useRouter();
  const t = useTranslations("main");
  const { theme } = useTheme();
  const { data: session } = useSession();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    [],
  );
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const menuItems = [
    {
      title: t("createProductionTask"),
      description: t("createProductionTaskDesc"),
      icon: <ToolOutlined style={{ fontSize: "36px" }} />,
      onClick: () => router.push("/production/tasks/create"),
    },
    {
      title: t("tasks"),
      description: t("tasksDesc"),
      icon: <TeamOutlined style={{ fontSize: "36px" }} />,
      onClick: () => router.push("/production/tasks"),
    },
    {
      title: t("inventoryModel"),
      description: t("inventoryModelDesc"),
      icon: <ShopOutlined style={{ fontSize: "36px" }} />,
      onClick: () => router.push("/mainMenu"),
    },
  ];

  const activityTitleMap = useMemo(
    () => ({
      "/production/tasks/create": t("createProductionTask"),
      "/production/tasks": t("tasks"),
      "/inventory/add": t("recentLabels.addInventoryItem"),
      "/inventory/receive": t("recentLabels.receiveInventory"),
      "/inventory/show": t("recentLabels.showInventoryList"),
      "/inventory/stock-count": t("recentLabels.stockCount"),
      "/inventory/snapshot": t("recentLabels.snapshot"),
      "/inventory/edit": t("recentLabels.editInventoryItem"),
      "/inventory/delete": t("recentLabels.deleteInventoryItem"),
      "/supplier/add": t("recentLabels.addSupplier"),
      "/supplier/list": t("recentLabels.showSuppliers"),
      "/supplier/edit": t("recentLabels.editSupplier"),
      "/invoice/list": t("recentLabels.showInvoiceList"),
      "/manager": t("manager"),
      "/manager/dashboard": t("recentLabels.managerDashboard"),
      "/manager/reports": t("recentLabels.managerReports"),
      "/manager/daily-report": t("recentLabels.dailyProductionReport"),
      "/manager/userManagment": t("recentLabels.userManagement"),
    }),
    [t],
  );

  useEffect(() => {
    if (!userId) {
      setRecentActivities([]);
      return;
    }

    setRecentActivities(getRecentActivities(userId, 10));
  }, [userId]);

  const resolveActivityTitle = (path: string) => activityTitleMap[path] ?? path;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "var(--background-color)",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <Breadcrumb
          style={{
            marginBottom: "24px",
            padding: "8px 16px",
            background:
              theme === "light"
                ? "var(--primary-color)"
                : "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            borderRadius: "8px",
            border:
              theme === "light"
                ? "1px solid var(--primary-hover-color)"
                : "1px solid rgba(255, 255, 255, 0.2)",
          }}
          items={[
            {
              title: (
                <>
                  <HomeOutlined
                    style={{
                      marginInlineEnd: 4,
                      color:
                        theme === "light"
                          ? "var(--header-bg)"
                          : "var(--primary-color)",
                    }}
                  />
                  <span
                    style={{
                      color:
                        theme === "light"
                          ? "var(--header-bg)"
                          : "var(--primary-color)",
                    }}
                  >
                    {t("home")}
                  </span>
                </>
              ),
            },
          ]}
        />

        {/* Header Section - royal-blue bg with gold text */}
        <div
          style={{
            background: "var(--header-bg)",
            borderRadius: "8px",
            padding: "40px",
            marginBottom: "32px",
            /* no border/stroke around welcome box */
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
          }}
        >
          <Title
            level={2}
            style={{
              color: theme === "light" ? "#ffffff" : "var(--text-color)",
              margin: 0,
              fontWeight: 700,
            }}
          >
            {t("mainHeading")}
          </Title>
          <Text
            style={{
              color: theme === "light" ? "#ffffff" : "var(--text-color)",
              fontSize: "16px",
              marginTop: "12px",
              display: "block",
            }}
          >
            {t("welcomeDesc")}
          </Text>
        </div>

        {/* Cards Grid */}
        <Row gutter={[24, 24]} style={{ paddingTop: 50, paddingBottom: 50 }}>
          {menuItems.map((item, index) => (
            <Col key={index} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                onClick={item.onClick}
                style={{
                  borderRadius: "8px",
                  /* no border/stroke as requested */
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(10px)",
                  height: "220px",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
                }}
                styles={{
                  body: {
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    padding: "28px",
                  },
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(0, 0, 0, 0.15)";
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 10px rgba(0, 0, 0, 0.08)";
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.25)";
                }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "8px",
                    background: "var(--header-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary-color)",
                    marginBottom: "20px",
                    /* icon container no stroke */
                    /* border: `2px solid var(--primary-color)`, */
                    boxShadow: "0 4px 15px rgba(255, 219, 83, 0.25)",
                  }}
                >
                  {item.icon}
                </div>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    marginBottom: "12px",
                    fontWeight: 700,
                    color: theme === "dark" ? "#ffffff" : "var(--header-bg)",
                  }}
                >
                  {item.title}
                </Title>
                <Text
                  style={{
                    color: "var(--text-color)",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    fontWeight: 500,
                  }}
                >
                  {item.description}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>

        <Card
          className={`recent-activities-section recent-activities-section-${theme}`}
          style={{
            marginTop: "24px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
            border: "none",
          }}
          styles={{ body: { padding: "24px" } }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <HistoryOutlined
              style={{
                color: theme === "light" ? "var(--primary-color)" : "#d6a82f",
                fontSize: "20px",
              }}
            />
            <Title
              level={4}
              style={{
                margin: 0,
                color: theme === "light" ? "var(--primary-color)" : "#ffffff",
                fontWeight: 700,
              }}
            >
              {t("recentActivities")}
            </Title>
          </div>

          {recentActivities.length === 0 ? (
            <Empty
              description={
                <span
                  style={{
                    color: theme === "light" ? "var(--text-color)" : "#ffffff",
                  }}
                >
                  {t("noRecentActivities")}
                </span>
              }
            />
          ) : (
            <div style={{ maxWidth: "720px", margin: "0 auto" }}>
              <div
                className={`recent-activities-scroll recent-activities-scroll-${theme}`}
                style={{
                  maxHeight: "390px",
                  overflowY: "auto",
                  paddingInline: "2px",
                }}
              >
                {recentActivities.map((activity) => (
                  <Card
                    className={`recent-activity-card recent-activity-card-${theme}`}
                    key={`${activity.path}-${activity.visitedAt}`}
                    hoverable
                    onClick={() => router.push(activity.path)}
                    style={{
                      borderRadius: "8px",
                      cursor: "pointer",
                      marginBottom: "10px",
                    }}
                    styles={{ body: { padding: "14px 16px" } }}
                  >
                    <div
                      style={{
                        color:
                          theme === "light" ? "var(--text-color)" : "#ffffff",
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                    >
                      {resolveActivityTitle(activity.path)}
                    </div>
                    <Text
                      style={{
                        color:
                          theme === "light" ? "var(--text-color)" : "#ffffff",
                        fontSize: "12px",
                      }}
                    >
                      {new Date(activity.visitedAt).toLocaleString()}
                    </Text>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
