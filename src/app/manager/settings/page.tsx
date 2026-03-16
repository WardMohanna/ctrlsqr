"use client";

import { useRouter } from "next/navigation";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTheme } from "@/hooks/useTheme";
import BackButton from "@/components/BackButton";
import { Card, Row, Col, Typography, Breadcrumb } from "antd";
import {
  SettingOutlined,
  HomeOutlined,
  TagsOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Title, Text } = Typography;

export default function ManagerSettingsPage() {
  const router = useRouter();
  const goUp = useNavigateUp();
  const t = useTranslations("manager.settings");
  const { theme } = useTheme();

  const settingsItems = [
    {
      title: t("accountCategories"),
      description: t("accountCategoriesDescription"),
      icon: <TagsOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/settings/account-categories",
      color: "#1677ff",
      bgColor: "rgba(22, 119, 255, 0.1)",
    },
    {
      title: t("paymentTerms"),
      description: t("paymentTermsDescription"),
      icon: <CreditCardOutlined style={{ fontSize: "36px" }} />,
      path: "/manager/settings/payment-terms",
      color: "#13c2c2",
      bgColor: "rgba(19, 194, 194, 0.1)",
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
              href: "/manager",
              title: (
                <span style={{ color: "#fff" }}>
                  {useTranslations("manager")("pageTitle")}
                </span>
              ),
            },
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

        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <Title
            level={2}
            style={{
              color: theme === "dark" ? "#ffffff" : "#000000",
              marginBottom: "8px",
            }}
          >
            {t("pageTitle")}
          </Title>
          <Text
            style={{
              color: theme === "dark" ? "#cccccc" : "#666666",
              fontSize: "16px",
            }}
          >
            {t("pageDescription")}
          </Text>
        </div>

        <Row gutter={[24, 24]}>
          {settingsItems.map((item, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={index}>
              <Card
                hoverable
                onClick={() => router.push(item.path)}
                style={{
                  height: "100%",
                  borderRadius: "12px",
                  cursor: "pointer",
                  background: theme === "dark" ? "#2a2a2a" : "#ffffff",
                  border: `1px solid ${
                    theme === "dark" ? "#444444" : "#e8e8e8"
                  }`,
                  transition: "all 0.3s ease",
                }}
                bodyStyle={{
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: item.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
                <Title
                  level={4}
                  style={{
                    margin: "0 0 8px 0",
                    color: theme === "dark" ? "#ffffff" : "#000000",
                  }}
                >
                  {item.title}
                </Title>
                <Text
                  style={{
                    color: theme === "dark" ? "#cccccc" : "#666666",
                    flex: 1,
                  }}
                >
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