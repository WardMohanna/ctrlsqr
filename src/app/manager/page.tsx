"use client";

import { useRouter } from "next/navigation";
import { Card, Row, Col, Typography } from "antd";
import { TeamOutlined, BarChartOutlined, DashboardOutlined } from "@ant-design/icons";

const { Title, Paragraph } = Typography;

export default function ManagerDashboardHome() {
  const router = useRouter();

  const menuItems = [
    {
      title: "Manage Users",
      description: "Add, remove, or update users in the system.",
      icon: <TeamOutlined style={{ fontSize: "48px", color: "#1677ff" }} />,
      path: "/manager/userManagment",
    },
    {
      title: "View Reports",
      description: "Access detailed logs and reports from your team.",
      icon: <BarChartOutlined style={{ fontSize: "48px", color: "#52c41a" }} />,
      path: "/manager/reports",
    },
    {
      title: "Dashboard",
      description: "View real-time statistics and KPIs.",
      icon: <DashboardOutlined style={{ fontSize: "48px", color: "#faad14" }} />,
      path: "/manager/dashboard",
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
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <Title level={1} style={{ color: "#fff", marginBottom: "16px" }}>
            🏢 Manager Dashboard
          </Title>
          <Paragraph style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "16px" }}>
            Welcome to your dashboard! Use the cards below to navigate.
          </Paragraph>
        </div>

        <Row gutter={[24, 24]} justify="center">
          {menuItems.map((item, index) => (
            <Col key={index} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                onClick={() => router.push(item.path)}
                style={{
                  borderRadius: "12px",
                  textAlign: "center",
                  height: "220px",
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                }}
                bodyStyle={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  padding: "32px",
                }}
              >
                <div style={{ marginBottom: "16px" }}>{item.icon}</div>
                <Title level={3} style={{ marginBottom: "8px", fontSize: "20px" }}>
                  {item.title}
                </Title>
                <Paragraph style={{ margin: 0, color: "#666" }}>
                  {item.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
}
