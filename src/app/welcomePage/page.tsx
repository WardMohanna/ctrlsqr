"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, Row, Col, Typography, Space } from "antd";
import { ToolOutlined, TeamOutlined, ShopOutlined } from "@ant-design/icons";

const { Title } = Typography;

export default function Main() {
  const router = useRouter();
  const t = useTranslations("main");

  const menuItems = [
    {
      title: t("createProductionTask"),
      icon: <ToolOutlined style={{ fontSize: "48px" }} />,
      color: "#7c3aed",
      onClick: () => router.push("/production/tasks/create"),
    },
    {
      title: t("tasks"),
      icon: <TeamOutlined style={{ fontSize: "48px" }} />,
      color: "#16a34a",
      onClick: () => router.push("/production/tasks"),
    },
    {
      title: t("inventoryModel"),
      icon: <ShopOutlined style={{ fontSize: "48px" }} />,
      color: "#1e40af",
      onClick: () => router.push("/mainMenu"),
    },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <Space direction="vertical" size="large" style={{ width: "100%", maxWidth: "900px" }}>
        <Title level={1} style={{ textAlign: "center", color: "#fff", marginBottom: "32px" }}>
          🎉 {t("mainHeading")} 🎉
        </Title>

        <Row gutter={[24, 24]} justify="center">
          {menuItems.map((item, index) => (
            <Col key={index} xs={24} sm={12} md={8}>
              <Card
                hoverable
                onClick={item.onClick}
                style={{
                  borderRadius: "12px",
                  textAlign: "center",
                  height: "200px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "none",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                }}
                bodyStyle={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  padding: "24px",
                }}
              >
                <div style={{ color: item.color, marginBottom: "16px" }}>
                  {item.icon}
                </div>
                <Title level={4} style={{ margin: 0, fontSize: "16px" }}>
                  {item.title}
                </Title>
              </Card>
            </Col>
          ))}
        </Row>
      </Space>
    </div>
  );
}
