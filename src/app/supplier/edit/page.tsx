// app/supplier/edit/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const [formChanged, setFormChanged] = useState(false);
  const initialFormValues = useRef<any>(null);

  // 1) load list of all suppliers (only _id and name for dropdown)
  useEffect(() => {
    fetch("/api/supplier?fields=_id,name")
      .then((res) => res.json())
      .then((data: Supplier[]) => setSuppliers(data))
      .catch((err) => console.error(err));
  }, []);

  // 2) when user selects one, load its details
  useEffect(() => {
    if (!selectedId) return;
    setLoadingSupplier(true);
    (async () => {
      try {
        const res = await fetch(`/api/supplier/${selectedId}`);
        if (!res.ok) throw new Error("Failed to load supplier");
        const supplier = await res.json();
        const values = {
          name: supplier.name ?? "",
          contactName: supplier.contactName ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          taxId: supplier.taxId ? supplier.taxId : undefined,
          paymentTerms: supplier.paymentTerms ?? "",
        };
        form.setFieldsValue(values);
        initialFormValues.current = values;
        setFormChanged(false);
      } catch (err: any) {
        console.error(err);
        messageApi.error(t("loadError"));
      } finally {
        setLoadingSupplier(false);
      }
    })();
  }, [selectedId, t, form, messageApi]);

  // Compare two objects shallowly
  function shallowEqual(obj1: any, obj2: any) {
    if (!obj1 || !obj2) return false;
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;
    for (let key of keys1) {
      let v1 = obj1[key];
      let v2 = obj2[key];
      if (v1 === undefined) v1 = "";
      if (v2 === undefined) v2 = "";
      if (typeof v1 === "number" && typeof v2 === "string" && v2 !== "")
        v2 = Number(v2);
      if (typeof v2 === "number" && typeof v1 === "string" && v1 !== "")
        v1 = Number(v1);
      if (v1 !== v2) return false;
    }
    return true;
  }

  // 3) submit updated supplier
  async function handleSubmit(values: any) {
    if (!selectedId) return;

    // Do not send empty string for taxId
    const payload = { ...values };
    if (typeof payload.taxId === "string" && payload.taxId.trim() === "") {
      delete payload.taxId;
    }

    try {
      const res = await fetch(`/api/supplier/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t("updateError"));
      }
      messageApi.success(t("updateSuccess"));
      setTimeout(() => {
        router.push("/mainMenu");
      }, 800);
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
                onValuesChange={() => {
                  if (!initialFormValues.current) return;
                  const currentValues = form.getFieldsValue();
                  setFormChanged(
                    !shallowEqual(initialFormValues.current, currentValues),
                  );
                }}
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
                    disabled={!formChanged}
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
