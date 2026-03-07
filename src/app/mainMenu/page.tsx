"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { Card, Row, Col, Typography, Space, Divider } from "antd";
import BackButton from "@/components/BackButton";
import {
  PlusOutlined,
  InboxOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  CameraOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  TeamOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

export default function MainMenu() {
  const router = useRouter();
  const goUp = useNavigateUp();
  const t = useTranslations("mainmenu");
  const { theme } = useTheme();

  const cardAccentColor = "#c97a3b";
  const darkIconColor = "#f0b97a";
  const darkIconGlow = "drop-shadow(0 0 1.8px rgba(240, 185, 122, 0.32))";

  const inventoryItems = [
    {
      title: t("addInventoryItem"),
      icon: <PlusOutlined />,
      href: "/inventory/add",
      color: cardAccentColor,
    },
    {
      title: t("receiveInventory"),
      icon: <InboxOutlined />,
      href: "/inventory/receive",
      color: cardAccentColor,
    },
    {
      title: t("showInventoryList"),
      icon: <UnorderedListOutlined />,
      href: "/inventory/show",
      color: cardAccentColor,
    },
    {
      title: t("stockCount"),
      icon: <FileTextOutlined />,
      href: "/inventory/stock-count",
      color: cardAccentColor,
    },
    {
      title: t("snapshot"),
      icon: <CameraOutlined />,
      href: "/inventory/snapshot",
      color: cardAccentColor,
    },
    {
      title: t("editInventoryItem"),
      icon: <EditOutlined />,
      href: "/inventory/edit",
      color: cardAccentColor,
    },
    {
      title: t("deleteInventoryItem"),
      icon: <DeleteOutlined />,
      href: "/inventory/delete",
      color: cardAccentColor,
    },
  ];

  const supplierItems = [
    {
      title: t("addSupplier"),
      icon: <UserAddOutlined />,
      href: "/supplier/add",
      color: cardAccentColor,
    },
    {
      title: t("showSuppliers"),
      icon: <TeamOutlined />,
      href: "/supplier/list",
      color: cardAccentColor,
    },
    {
      title: t("editSupplier"),
      icon: <EditOutlined />,
      href: "/supplier/edit",
      color: cardAccentColor,
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
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <BackButton onClick={goUp}>{t("back")}</BackButton>

          {/* Inventory Section */}
          <Card
            style={{
              borderRadius: "12px",
              border: "none",
              boxShadow:
                theme === "dark"
                  ? "0 6px 20px rgba(0, 0, 0, 0.6)"
                  : "0 4px 12px rgba(0, 0, 0, 0.08)",
              background: theme === "dark" ? "#000000" : "#ffffff",
            }}
          >
            <div
              style={{
                marginTop: "20px",
                marginBottom: "40px",
                padding: "10px 16px",
                textAlign: "center",
                background: "transparent",
                borderRadius: "8px",
              }}
            >
              <Title
                level={2}
                className="main-menu-section-title"
                style={{ margin: 0 }}
              >
                {t("inventoryManagement")}
              </Title>
            </div>
            <Row gutter={[16, 16]} style={{ marginBottom: 30 }}>
              {inventoryItems.map((item, index) => (
                <Col key={index} xs={12} sm={8} md={6}>
                  <Link href={item.href}>
                    <div>
                      <Card
                        hoverable
                        style={{
                          textAlign: "center",
                          height: "140px",
                          borderRadius: "8px",
                          border: "none",
                          overflow: "hidden",
                          boxShadow:
                            theme === "dark"
                              ? "0 4px 12px rgba(0, 0, 0, 0.4)"
                              : "0 2px 8px rgba(0, 0, 0, 0.06)",
                          background: theme === "dark" ? "#000000" : "#ffffff",
                        }}
                        styles={{
                          body: {
                            background:
                              theme === "dark" ? "#000000" : "#ffffff",
                            borderRadius: "8px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            padding: "16px",
                          },
                        }}
                      >
                        <div
                          style={{
                            fontSize: "32px",
                            color:
                              theme === "dark" ? darkIconColor : item.color,
                            marginBottom: "8px",
                            filter: theme === "dark" ? darkIconGlow : undefined,
                          }}
                        >
                          {item.icon}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--text-color)",
                          }}
                        >
                          {item.title}
                        </div>
                      </Card>
                    </div>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Supplier Section */}
          <Card
            style={{
              borderRadius: "12px",
              border: "none",
              boxShadow:
                theme === "dark"
                  ? "0 6px 20px rgba(0, 0, 0, 0.6)"
                  : "0 4px 12px rgba(0, 0, 0, 0.08)",
              background: theme === "dark" ? "#000000" : "#ffffff",
            }}
          >
            <div
              style={{
                marginTop: "20px",
                marginBottom: "40px",
                padding: "10px 16px",
                textAlign: "center",
                background: "transparent",
                borderRadius: "8px",
              }}
            >
              <Title
                level={2}
                className="main-menu-section-title"
                style={{ margin: 0 }}
              >
                {t("supplierManagement")}
              </Title>
            </div>
            <Row
              gutter={[16, 16]}
              justify="center"
              style={{ marginBottom: 30 }}
            >
              {supplierItems.map((item, index) => (
                <Col key={index} xs={12} sm={8} md={8}>
                  <Link href={item.href}>
                    <Card
                      hoverable
                      style={{
                        textAlign: "center",
                        height: "140px",
                        borderRadius: "8px",
                        border: "none",
                        overflow: "hidden",
                        boxShadow:
                          theme === "dark"
                            ? "0 4px 12px rgba(0, 0, 0, 0.4)"
                            : "0 2px 8px rgba(0, 0, 0, 0.06)",
                        background: theme === "dark" ? "#000000" : "#ffffff",
                      }}
                      styles={{
                        body: {
                          background: theme === "dark" ? "#000000" : "#ffffff",
                          borderRadius: "8px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          padding: "16px",
                        },
                      }}
                    >
                      <div
                        style={{
                          fontSize: "32px",
                          color: theme === "dark" ? darkIconColor : item.color,
                          marginBottom: "8px",
                          filter: theme === "dark" ? darkIconGlow : undefined,
                        }}
                      >
                        {item.icon}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--text-color)",
                        }}
                      >
                        {item.title}
                      </div>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>

          {/* Invoice Section */}
          <Card
            style={{
              borderRadius: "12px",
              border: "none",
              boxShadow:
                theme === "dark"
                  ? "0 6px 20px rgba(0, 0, 0, 0.6)"
                  : "0 4px 12px rgba(0, 0, 0, 0.08)",
              background: theme === "dark" ? "#000000" : "#ffffff",
            }}
          >
            <div
              style={{
                marginTop: "20px",
                marginBottom: "40px",
                padding: "10px 16px",
                textAlign: "center",
                background: "transparent",
                borderRadius: "8px",
              }}
            >
              <Title
                level={2}
                className="main-menu-section-title"
                style={{ margin: 0 }}
              >
                {t("invoiceManagement")}
              </Title>
            </div>
            <Row
              gutter={[16, 16]}
              justify="center"
              style={{ marginBottom: 30 }}
            >
              <Col xs={24} sm={12} md={8}>
                <Link href="/invoice/list">
                  <Card
                    hoverable
                    style={{
                      textAlign: "center",
                      height: "140px",
                      borderRadius: "8px",
                      border: "2px solid var(--header-bg)",
                      background: "var(--primary-color)",
                    }}
                    styles={{
                      body: {
                        background: "var(--primary-color)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        padding: "16px",
                      },
                    }}
                  >
                    <div
                      style={{
                        fontSize: "32px",
                        color: "var(--header-bg)",
                        marginBottom: "8px",
                      }}
                    >
                      <UnorderedListOutlined />
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--header-bg)",
                      }}
                    >
                      {t("showInvoiceList")}
                    </div>
                  </Card>
                </Link>
              </Col>
            </Row>
          </Card>
        </Space>
      </div>
    </div>
  );
}
