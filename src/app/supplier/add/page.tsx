"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTheme } from "@/hooks/useTheme";
import { useTranslations } from "next-intl";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { RestoreFormModal } from "@/components/RestoreFormModal";
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Space,
  Row,
  Col,
  Select,
} from "antd";
import {
  ArrowRightOutlined,
  SaveOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";

export default function AddSupplierPage() {
  const router = useRouter();
  const goUp = useNavigateUp();
  const t = useTranslations("supplier.add");
  const { theme } = useTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Form persistence hook
  const {
    showRestoreModal,
    handleRestoreConfirm,
    handleRestoreCancel,
    saveFormData,
    clearSavedData,
  } = useFormPersistence({
    formKey: "supplier-add",
    form,
  });

  async function handleSubmit(values: any) {
    setLoading(true);

    try {
      const response = await fetch("/api/supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        // Just pass the error key, don't translate yet
        throw new Error(data.error || "createError");
      }

      messageApi.success(t("createSuccess"));
      clearSavedData();
      form.resetFields();
      setTimeout(() => {
        router.push("/supplier/list");
      }, 200);
    } catch (err: any) {
      const errorKey = err.message || "createError";
      const translatedMsg = t(errorKey);
      messageApi.error(translatedMsg, 5);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
        padding: "24px",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <BackButton onClick={goUp} size="large">
            {t("back")}
          </BackButton>

          <Card
            style={{
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: "32px",
              }}
            >
              {t("title")}
            </h1>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onValuesChange={saveFormData}
              size="large"
              autoComplete="off"
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="name"
                    label={t("nameLabel")}
                    rules={[{ required: true, message: t("nameRequired") }]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder={t("namePlaceholder")}
                      autoComplete="new-password"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="contactName" label={t("contactLabel")}>
                    <Input
                      prefix={<UserOutlined />}
                      placeholder={t("contactPlaceholder")}
                      autoComplete="new-password"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="phone" label={t("phoneLabel")}>
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder={t("phonePlaceholder")}
                      autoComplete="new-password"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label={t("emailLabel")}
                    rules={[
                      { type: "email", message: "Please enter a valid email" },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder={t("emailPlaceholder")}
                      autoComplete="new-password"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item name="address" label={t("addressLabel")}>
                    <Input
                      prefix={<HomeOutlined />}
                      placeholder={t("addressPlaceholder")}
                      autoComplete="new-password"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="taxId"
                    label={t("taxLabel")}
                    rules={[{ required: true, message: t("taxRequired") }]}
                  >
                    <Input
                      placeholder={t("taxPlaceholder")}
                      autoComplete="new-password"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="paymentTerms"
                    label={t("paymentLabel")}
                    rules={[{ required: true, message: t("paymentRequired") }]}
                  >
                    <Select placeholder={t("selectTerms")}>
                      <Select.Option value="Cash on Delivery">
                        {t("option_cod")}
                      </Select.Option>
                      <Select.Option value="Net 5">
                        {t("option_net5")}
                      </Select.Option>
                      <Select.Option value="Net 10">
                        {t("option_net10")}
                      </Select.Option>
                      <Select.Option value="Net 15">
                        {t("option_net15")}
                      </Select.Option>
                      <Select.Option value="Net 30">
                        {t("option_net30")}
                      </Select.Option>
                      <Select.Option value="Net 60">
                        {t("option_net60")}
                      </Select.Option>
                      <Select.Option value="Prepaid">
                        {t("option_prepaid")}
                      </Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginBottom: 0, marginTop: "24px" }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                  icon={<SaveOutlined />}
                >
                  {t("submit")}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Space>
      </div>

      {/* RESTORE CONFIRMATION MODAL */}
      <RestoreFormModal
        open={showRestoreModal}
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
        translationKey="supplier.add"
      />
    </div>
  );
}
