// app/supplier/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  message,
  Space,
  Row,
  Col,
  Spin,
} from "antd";
import {
  ArrowRightOutlined,
  SaveOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  BankOutlined,
  DollarOutlined,
} from "@ant-design/icons";

interface Supplier {
  _id: string;
  name: string;
}

export default function EditSupplierPage() {
  const router = useRouter();
  const t = useTranslations("supplier.edit");
  const [form] = Form.useForm();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // 1) load list of all suppliers
  useEffect(() => {
    fetch("/api/supplier")
      .then((res) => res.json())
      .then((data: Supplier[]) => setSuppliers(data))
      .catch((err) => console.error(err));
  }, []);

  // 2) when user selects one, load its details
  useEffect(() => {
    if (!selectedId) return;
    setLoadingSupplier(true);
    fetch(`/api/supplier/${selectedId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load supplier");
        return res.json();
      })
      .then((supplier: any) => {
        form.setFieldsValue({
          name: supplier.name ?? "",
          contactName: supplier.contactName ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          taxId: supplier.taxId ?? "",
          paymentTerms: supplier.paymentTerms ?? "",
        });
      })
      .catch((err) => {
        console.error(err);
        messageApi.error(t("loadError"));
      })
      .finally(() => setLoadingSupplier(false));
  }, [selectedId, t, form, messageApi]);

  // 3) submit updated supplier
  async function handleSubmit(values: any) {
    if (!selectedId) return;

    try {
      const res = await fetch(`/api/supplier/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t("updateError"));
      }
      messageApi.success(t("updateSuccess"));
    } catch (err: any) {
      console.error(err);
      messageApi.error(err.message);
    }
  }

  return (
    <div
      style={{
        padding: "24px",
        background: "#f0f2f5",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <Card>
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>
                {t("title")}
              </h1>
              <Button
                icon={<ArrowRightOutlined />}
                onClick={() => router.back()}
              >
                {t("back")}
              </Button>
            </div>

            {/* Supplier selector */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 500,
                }}
              >
                {t("selectLabel")}
              </label>
              <Select
                style={{ width: "100%" }}
                value={selectedId || undefined}
                onChange={(value) => {
                  setSelectedId(value);
                  form.resetFields();
                }}
                placeholder={t("selectPlaceholder")}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={suppliers.map((s) => ({
                  value: s._id,
                  label: s.name,
                }))}
              />
            </div>

            {loadingSupplier ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spin size="large" />
              </div>
            ) : selectedId ? (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t("nameLabel")}
                      name="name"
                      rules={[{ required: true, message: t("nameRequired") }]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder={t("namePlaceholder")}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item label={t("contactLabel")} name="contactName">
                      <Input
                        prefix={<UserOutlined />}
                        placeholder={t("contactPlaceholder")}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item label={t("phoneLabel")} name="phone">
                      <Input
                        prefix={<PhoneOutlined />}
                        placeholder={t("phonePlaceholder")}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t("emailLabel")}
                      name="email"
                      rules={[{ type: "email" }]}
                    >
                      <Input
                        prefix={<MailOutlined />}
                        placeholder={t("emailPlaceholder")}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item label={t("addressLabel")} name="address">
                      <Input
                        prefix={<HomeOutlined />}
                        placeholder={t("addressPlaceholder")}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item label={t("taxLabel")} name="taxId">
                      <Input
                        prefix={<BankOutlined />}
                        placeholder={t("taxPlaceholder")}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label={t("paymentLabel")}
                      name="paymentTerms"
                      rules={[
                        { required: true, message: t("paymentRequired") },
                      ]}
                    >
                      <Select
                        placeholder={t("selectTerms")}
                        prefix={<DollarOutlined />}
                      >
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

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    size="large"
                    block
                  >
                    {t("update")}
                  </Button>
                </Form.Item>
              </Form>
            ) : null}
          </Space>
        </Card>
      </div>
    </div>
  );
}
