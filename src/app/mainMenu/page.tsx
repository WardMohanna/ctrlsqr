"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, Row, Col, Typography, Space, Button, Divider } from "antd";
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
  ArrowRightOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

export default function MainMenu() {
  const router = useRouter();
  const t = useTranslations("mainmenu");

  // Memoize navigation handler to prevent recreation on every render
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const inventoryItems = [
    {
      title: t("addInventoryItem"),
      icon: <PlusOutlined />,
      href: "/inventory/add",
      color: "#7c3aed",
    },
    {
      title: t("receiveInventory"),
      icon: <InboxOutlined />,
      href: "/inventory/receive",
      color: "#16a34a",
    },
    {
      title: t("showInventoryList"),
      icon: <UnorderedListOutlined />,
      href: "/inventory/show",
      color: "#1e40af",
    },
    {
      title: t("stockCount"),
      icon: <FileTextOutlined />,
      href: "/inventory/stock-count",
      color: "#dc2626",
    },
    {
      title: t("snapshot"),
      icon: <CameraOutlined />,
      href: "/inventory/snapshot",
      color: "#db2777",
    },
    {
      title: t("editInventoryItem"),
      icon: <EditOutlined />,
      href: "/inventory/edit",
      color: "#ea580c",
    },
    {
      title: t("deleteInventoryItem"),
      icon: <DeleteOutlined />,
      href: "/inventory/delete",
      color: "#ef4444",
    },
  ];

  const supplierItems = [
    {
      title: t("addSupplier"),
      icon: <UserAddOutlined />,
      href: "/supplier/add",
      color: "#db2777",
    },
    {
      title: t("showSuppliers"),
      icon: <TeamOutlined />,
      href: "/supplier/list",
      color: "#0891b2",
    },
    {
      title: t("editSupplier"),
      icon: <EditOutlined />,
      href: "/supplier/edit",
      color: "#eab308",
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
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Button
            icon={<ArrowRightOutlined />}
            onClick={handleBack}
            size="large"
          >
            {t("back")}
          </Button>

          {/* Inventory Section */}
          <Card
            style={{
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Title
              level={2}
              style={{ marginBottom: "24px", textAlign: "center" }}
            >
              📦 {t("inventoryManagement")}
            </Title>
            <Row gutter={[16, 16]}>
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
                          border: `2px solid ${item.color}`,
                        }}
                        styles={{
                          body: {
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
                            color: item.color,
                            marginBottom: "8px",
                          }}
                        >
                          {item.icon}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 500 }}>
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
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Title
              level={2}
              style={{ marginBottom: "24px", textAlign: "center" }}
            >
              🏷️ {t("supplierManagement")}
            </Title>
            <Row gutter={[16, 16]} justify="center">
              {supplierItems.map((item, index) => (
                <Col key={index} xs={12} sm={8} md={8}>
                  <Link href={item.href}>
                    <Card
                      hoverable
                      style={{
                        textAlign: "center",
                        height: "140px",
                        borderRadius: "8px",
                        border: `2px solid ${item.color}`,
                      }}
                      styles={{
                        body: {
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
                          color: item.color,
                          marginBottom: "8px",
                        }}
                      >
                        {item.icon}
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 500 }}>
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
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Title
              level={2}
              style={{ marginBottom: "24px", textAlign: "center" }}
            >
              🧾 {t("invoiceManagement")}
            </Title>
            <Row gutter={[16, 16]} justify="center">
              <Col xs={24} sm={12} md={8}>
                <Link href="/invoice/list">
                  <Card
                    hoverable
                    style={{
                      textAlign: "center",
                      height: "140px",
                      borderRadius: "8px",
                      border: "2px solid #7c3aed",
                    }}
                    styles={{
                      body: {
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
                        color: "#7c3aed",
                        marginBottom: "8px",
                      }}
                    >
                      <UnorderedListOutlined />
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>
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
