"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, Row, Col, Typography, Breadcrumb } from "antd";
import { ToolOutlined, TeamOutlined, ShopOutlined, HomeOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function Main() {
  const router = useRouter();
  const t = useTranslations("main");

  const menuItems = [
    {
      title: t("createProductionTask"),
      description: t("createProductionTaskDesc"),
      icon: <ToolOutlined style={{ fontSize: "36px" }} />,
      color: "#7c3aed",
      bgColor: "rgba(124, 58, 237, 0.1)",
      onClick: () => router.push("/production/tasks/create"),
    },
    {
      title: t("tasks"),
      description: t("tasksDesc"),
      icon: <TeamOutlined style={{ fontSize: "36px" }} />,
      color: "#16a34a",
      bgColor: "rgba(22, 163, 74, 0.1)",
      onClick: () => router.push("/production/tasks"),
    },
    {
      title: t("inventoryModel"),
      description: t("inventoryModelDesc"),
      icon: <ShopOutlined style={{ fontSize: "36px" }} />,
      color: "#1e40af",
      bgColor: "rgba(30, 64, 175, 0.1)",
      onClick: () => router.push("/mainMenu"),
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
            { title: <><HomeOutlined style={{ marginInlineEnd: 4 }} />{t("home")}</> },
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
            {t("mainHeading")}
          </Title>
          <Text style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "15px", marginTop: "8px", display: "block" }}>
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
