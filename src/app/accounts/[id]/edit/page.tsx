"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  Checkbox,
  Divider,
  InputNumber,
  Spin,
} from "antd";
import {
  SaveOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";

interface Contact {
  name?: string;
  phone?: string;
  email?: string;
}

interface Account {
  _id: string;
  officialEntityName: string;
  taxId: string;
  category: string;
  city?: string;
  address?: string;
  active: boolean;
  contacts: Contact[];
  paymentTerms?: string;
  creditLimit?: number;
}

export default function EditAccountPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;
  const t = useTranslations("accounts.edit");
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const [categories, setCategories] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [contacts, setContacts] = useState<Contact[]>([{}, {}, {}]);
  const [account, setAccount] = useState<Account | null>(null);

  // Fetch account, categories, and payment terms
  useEffect(() => {
    async function fetchData() {
      try {
        const [accountRes, categoriesRes, termsRes] = await Promise.all([
          fetch(`/api/accounts/${accountId}`),
          fetch("/api/account-categories"),
          fetch("/api/payment-terms"),
        ]);

        if (accountRes.ok) {
          const data = await accountRes.json();
          setAccount(data);
          form.setFieldsValue(data);

          // Set contacts
          const filledContacts = data.contacts || [{}, {}, {}];
          while (filledContacts.length < 3) {
            filledContacts.push({});
          }
          setContacts(filledContacts);
        } else {
          messageApi.error(t("accountNotFound"));
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data);
        }

        if (termsRes.ok) {
          const data = await termsRes.json();
          setPaymentTerms(data);
        }
      } catch (error) {
        messageApi.error(t("fetchError"));
      } finally {
        setFetching(false);
      }
    }

    fetchData();
  }, [accountId, form, messageApi, t]);

  const handleContactChange = (index: number, field: string, value: any) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  };

  async function handleSubmit(values: any) {
    setLoading(true);

    try {
      // Filter out empty contacts
      const filledContacts = contacts.filter(
        (c) => c.name || c.phone || c.email
      );

      if (filledContacts.length > 3) {
        throw new Error("maximumThreeContactsAllowed");
      }

      const payload = {
        ...values,
        active: values.active !== false,
        contacts: filledContacts,
      };

      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "updateError");
      }

      messageApi.success(t("updateSuccess"));
      setTimeout(() => {
        router.push("/accounts/list");
      }, 300);
    } catch (err: any) {
      const errorKey = err.message || "updateError";
      const translatedMsg = t(errorKey);
      messageApi.error(translatedMsg, 5);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <BackButton onClick={() => router.back()} size="large">
            {t("back")}
          </BackButton>

          <Card
            style={{
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
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
              size="large"
            >
              {/* GENERAL INFORMATION */}
              <div style={{ marginBottom: "32px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
                  {t("generalInfo")}
                </h2>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="officialEntityName"
                      label={t("entityNameLabel")}
                      rules={[
                        { required: true, message: t("entityNameRequired") },
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder={t("entityNamePlaceholder")}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name="taxId"
                      label={t("taxIdLabel")}
                      rules={[{ required: true, message: t("taxIdRequired") }]}
                    >
                      <Input placeholder={t("taxIdPlaceholder")} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      name="category"
                      label={t("categoryLabel")}
                      rules={[
                        { required: true, message: t("categoryRequired") },
                      ]}
                    >
                      <Select placeholder={t("selectCategory")}>
                        {categories.map((cat: any) => (
                          <Select.Option key={cat._id} value={cat.name}>
                            {cat.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="city" label={t("cityLabel")}>
                      <Input placeholder={t("cityPlaceholder")} />
                    </Form.Item>
                  </Col>

                  <Col xs={24}>
                    <Form.Item name="address" label={t("addressLabel")}>
                      <Input
                        prefix={<HomeOutlined />}
                        placeholder={t("addressPlaceholder")}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="active" valuePropName="checked">
                      <Checkbox>{t("activeLabel")}</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <Divider />

              {/* CONTACTS */}
              <div style={{ marginBottom: "32px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
                  {t("contactsLabel")} (Max 3)
                </h2>

                {contacts.map((contact, index) => (
                  <Card
                    key={index}
                    size="small"
                    style={{ marginBottom: "16px" }}
                    title={`${t("contact")} ${index + 1}`}
                  >
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <label style={{ display: "block", marginBottom: "8px" }}>
                          {t("contactNameLabel")}
                        </label>
                        <Input
                          prefix={<UserOutlined />}
                          placeholder={t("contactNamePlaceholder")}
                          value={contact.name || ""}
                          onChange={(e) =>
                            handleContactChange(index, "name", e.target.value)
                          }
                        />
                      </Col>

                      <Col xs={24} md={12}>
                        <label style={{ display: "block", marginBottom: "8px" }}>
                          {t("phoneLabel")}
                        </label>
                        <Input
                          prefix={<PhoneOutlined />}
                          placeholder={t("phonePlaceholder")}
                          value={contact.phone || ""}
                          onChange={(e) =>
                            handleContactChange(index, "phone", e.target.value)
                          }
                        />
                      </Col>

                      <Col xs={24}>
                        <label style={{ display: "block", marginBottom: "8px" }}>
                          {t("emailLabel")}
                        </label>
                        <Input
                          prefix={<MailOutlined />}
                          type="email"
                          placeholder={t("emailPlaceholder")}
                          value={contact.email || ""}
                          onChange={(e) =>
                            handleContactChange(index, "email", e.target.value)
                          }
                        />
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>

              <Divider />

              {/* PAYMENT INFORMATION */}
              <div style={{ marginBottom: "32px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
                  {t("paymentInfo")}
                </h2>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="paymentTerms" label={t("paymentTermsLabel")}>
                      <Select placeholder={t("selectPaymentTerms")}>
                        {paymentTerms.map((term: any) => (
                          <Select.Option key={term._id} value={term.name}>
                            {term.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="creditLimit" label={t("creditLimitLabel")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder={t("creditLimitPlaceholder")}
                        min={0}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

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
    </div>
  );
}
