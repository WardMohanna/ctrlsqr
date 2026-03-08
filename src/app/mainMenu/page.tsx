"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { Card, Typography, Space } from "antd";
import BackButton from "@/components/BackButton";
import MagicBento from "@/components/MagicBento.jsx";
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
  const goUp = useNavigateUp();
  const t = useTranslations("mainmenu");
  const { theme } = useTheme();

  const cardAccentColor = "#c97a3b";
  const darkIconColor = "#f0b97a";
  const darkIconGlow = "drop-shadow(0 0 1.8px rgba(240, 185, 122, 0.32))";
  const menuGlowColor = theme === "dark" ? "255, 219, 83" : "19, 44, 75";
  const menuCardBg = theme === "dark" ? "#05070c" : "#ffffff";
  const menuCardBorderColor =
    theme === "dark" ? "rgba(255, 219, 83, 0.3)" : "rgba(19, 44, 75, 0.2)";

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

  const invoiceItems = [
    {
      title: t("showInvoiceList"),
      icon: <UnorderedListOutlined />,
      href: "/invoice/list",
      color: cardAccentColor,
      featured: true,
    },
  ];

  const renderMagicMenuItem = (item: {
    title: string;
    icon: ReactNode;
    href: string;
    color: string;
    featured?: boolean;
  }) => (
    <>
      <Link
        href={item.href}
        className="magic-menu-link"
        aria-label={item.title}
      />
      <div className="magic-menu-content">
        <div
          className="magic-menu-icon"
          style={{
            color: item.featured
              ? "var(--header-bg)"
              : theme === "dark"
                ? darkIconColor
                : item.color,
            filter:
              item.featured || theme !== "dark" ? undefined : darkIconGlow,
          }}
        >
          {item.icon}
        </div>
        <div
          className="magic-menu-title"
          style={{
            color: item.featured ? "var(--header-bg)" : "var(--text-color)",
          }}
        >
          {item.title}
        </div>
      </div>
    </>
  );

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
            <MagicBento
              items={inventoryItems}
              renderItem={renderMagicMenuItem}
              gridClassName="magic-menu-grid"
              cardClassName="magic-menu-card"
              textAutoHide={false}
              enableStars={false}
              enableSpotlight
              enableBorderGlow
              spotlightRadius={216}
              enableTilt
              enableMagnetism
              clickEffect
              glowColor={menuGlowColor}
              getCardStyle={() => ({
                backgroundColor: menuCardBg,
                borderColor: menuCardBorderColor,
              })}
            />
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
            <MagicBento
              items={supplierItems}
              renderItem={renderMagicMenuItem}
              gridClassName="magic-menu-grid"
              cardClassName="magic-menu-card"
              textAutoHide={false}
              enableStars={false}
              enableSpotlight
              enableBorderGlow
              spotlightRadius={216}
              enableTilt
              enableMagnetism
              clickEffect
              glowColor={menuGlowColor}
              getCardStyle={() => ({
                backgroundColor: menuCardBg,
                borderColor: menuCardBorderColor,
              })}
            />
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
            <MagicBento
              items={invoiceItems}
              renderItem={renderMagicMenuItem}
              gridClassName="magic-menu-grid"
              cardClassName="magic-menu-card"
              textAutoHide={false}
              enableStars={false}
              enableSpotlight
              enableBorderGlow
              spotlightRadius={216}
              enableTilt
              enableMagnetism
              clickEffect
              glowColor={menuGlowColor}
              getCardStyle={(item) =>
                item.featured
                  ? {
                      backgroundColor: "var(--primary-color)",
                      borderColor: "transparent",
                      "--glow-color-rgb": menuGlowColor,
                    }
                  : {
                      backgroundColor: menuCardBg,
                      borderColor: menuCardBorderColor,
                    }
              }
            />
          </Card>
        </Space>
      </div>
    </div>
  );
}
