"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  Form,
  Button,
  Checkbox,
  Input,
  Row,
  Col,
  message,
  Space,
  Divider,
  Select,
  Switch,
  Tooltip,
  Modal,
} from "antd";
import {
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useLocale } from "@/hooks/useLocale";
import { builtInAccountFields, defaultVisibleAccountFields } from "@/lib/accountFields";

interface ClientSettings {
  _id?: string;
  visibleFields: string[];
  mandatoryFields: string[];
  defaultVisibleFields: string[];
  availableCustomFields: Array<{ name: string; description?: string }>;
  allowMultipleCategories: boolean;
  allowCustomCategories: boolean;
  allowCustomPaymentTerms: boolean;
}

export default function ClientsSettingsPage() {
  const t = useTranslations("manager.settings");
  const goUp = useNavigateUp();
  const { locale, setLocale } = useLocale();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const [settings, setSettings] = useState<ClientSettings | null>(null);
  const [visibleFields, setVisibleFields] = useState<string[]>(defaultVisibleAccountFields);
  const [mandatoryFields, setMandatoryFields] = useState<string[]>(["officialEntityName", "taxId"]);
  const [defaultVisible, setDefaultVisible] = useState<string[]>(defaultVisibleAccountFields);
  const [customFields, setCustomFields] = useState<Array<{ name: string; description?: string }>>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldDesc, setNewFieldDesc] = useState("");

  // Fetch current settings
  useEffect(() => {
    async function fetch() {
      try {
        const res = await fetch("/api/client-settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          setVisibleFields(data.visibleFields || defaultVisibleAccountFields);
          setMandatoryFields(data.mandatoryFields || ["officialEntityName", "taxId"]);
          setDefaultVisible(data.defaultVisibleFields || defaultVisibleAccountFields);
          setCustomFields(data.availableCustomFields || []);
          form.setFieldsValue({
            allowMultipleCategories: data.allowMultipleCategories,
            allowCustomCategories: data.allowCustomCategories,
            allowCustomPaymentTerms: data.allowCustomPaymentTerms,
          });
        }
      } catch (error) {
        messageApi.error(t("loadSettingsError"));
      } finally {
        setFetching(false);
      }
    }
    fetch();
  }, [form, messageApi]);

  const handleVisibleFieldsChange = (changedFields: string[]) => {
    // Ensure mandatory fields stay selected
    const updated = new Set(changedFields);
    mandatoryFields.forEach(field => updated.add(field));
    setVisibleFields(Array.from(updated));
  };

  const handleMandatoryFieldsChange = (changedFields: string[]) => {
    setMandatoryFields(changedFields);
    // Mandatory fields should also be visible
    const updated = new Set(visibleFields);
    changedFields.forEach(field => updated.add(field));
    setVisibleFields(Array.from(updated));
  };

  const handleDefaultVisibleChange = (changedFields: string[]) => {
    setDefaultVisible(changedFields);
  };

  const handleAddCustomField = () => {
    const trimmed = newFieldName.trim();
    if (!trimmed) {
      messageApi.error(t("fieldNameRequired"));
      return;
    }

    if (builtInAccountFields.some(f => f.key === trimmed)) {
      messageApi.error(t("builtInFieldConflict"));
      return;
    }

    if (customFields.some(f => f.name === trimmed)) {
      messageApi.error(t("customFieldExists"));
      return;
    }

    setCustomFields(prev => [...prev, { name: trimmed, description: newFieldDesc }]);
    setNewFieldName("");
    setNewFieldDesc("");
    messageApi.success(t("customFieldAdded"));
  };

  const handleDeleteCustomField = (fieldName: string) => {
    Modal.confirm({
      title: t("deleteCustomFieldTitle"),
      content: t("deleteCustomFieldContent", { fieldName }),
      okText: t("delete"),
      cancelText: t("cancel"),
      onOk() {
        setCustomFields(prev => prev.filter(f => f.name !== fieldName));
      },
    });
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const payload: ClientSettings = {
        visibleFields,
        mandatoryFields,
        defaultVisibleFields: defaultVisible,
        availableCustomFields: customFields,
        allowMultipleCategories: values.allowMultipleCategories || false,
        allowCustomCategories: values.allowCustomCategories || true,
        allowCustomPaymentTerms: values.allowCustomPaymentTerms || true,
      };

      const res = await fetch("/api/client-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(t("saveSettingsError"));

      messageApi.success(t("settingsSavedSuccess"));
    } catch (error: any) {
      messageApi.error(error.message || t("saveSettingsError"));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }

  const builtInFieldKeys = builtInAccountFields.map(f => f.key);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "#000000",
        padding: "24px",
        color: "#ffffff",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <BackButton onClick={goUp} size="large">
            {t("back")}
          </BackButton>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0, color: "#ffffff" }}>
            {t("clientsSettingsTitle")}
          </h1>

          <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 12 }}>
            <Col>
              <span style={{ fontWeight: 600, color: "#ffffff" }}>{t("language")}: </span>
            </Col>
            <Col>
              <Select
                value={locale}
                onChange={(value) => {
                  setLocale(value as any);
                  window.location.reload();
                }}
                options={[
                  { label: "English", value: "en" },
                  { label: "עברית", value: "he" },
                  { label: "العربية", value: "ar" },
                  { label: "Русский", value: "ru" },
                ]}
                style={{ width: 160 }}
              />
            </Col>
          </Row>

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* B2B CLIENT FIELDS */}
            <Card
              title={
                <span style={{ color: "#ffffff" }}>
                  <span style={{ marginRight: "8px" }}>📋</span>
                  {t("clientFieldsConfiguration")}
                </span>
              }
              style={{ marginBottom: "24px", background: "#1a1a1a", borderColor: "#333333" }}
              headStyle={{ background: "#1a1a1a", borderColor: "#333333" }}
            >
              {/* Visible Fields */}
              <Form.Item label={<span style={{ color: "#ffffff" }}>{t("visibleFieldsForUsers")}</span>}> 
                <p style={{ fontSize: "13px", color: "#cccccc", marginBottom: "12px", fontWeight: "500" }}>
                  {t("visibleFieldsDescription")}
                </p>
                <div style={{ padding: "12px", background: "#222222", borderRadius: "8px", border: "1px solid #333333" }}>
                  <Checkbox.Group
                    value={visibleFields}
                    onChange={handleVisibleFieldsChange}
                    options={builtInFieldKeys.map(key => {
                      const field = builtInAccountFields.find(f => f.key === key);
                      const isMandatory = mandatoryFields.includes(key);
                      return {
                        label: <span style={{ color: "#ffffff", fontSize: "14px" }}>{isMandatory ? `${field?.label} (mandatory)` : field?.label}</span>,
                        value: key,
                        disabled: isMandatory,
                      };
                    })}
                    style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                  />
                </div>
              </Form.Item>

              <Divider />

              {/* Mandatory Fields */}
              <Form.Item label={<span style={{ color: "#ffffff" }}>{t("mandatoryFields")}</span>}>
                <Tooltip title={t("usersCannotHideFieldsTooltip")}>
                  <div style={{ marginBottom: "8px", display: "flex", gap: "4px" }}>
                    <InfoCircleOutlined style={{ color: "#1677ff" }} />
                    <span style={{ fontSize: "13px", color: "#cccccc", fontWeight: "500" }}>
                      {t("usersCannotHideFields")}
                    </span>
                  </div>
                </Tooltip>
                <div style={{ padding: "12px", background: "#222222", borderRadius: "8px", border: "1px solid #333333" }}>
                  <Checkbox.Group
                    value={mandatoryFields}
                    onChange={handleMandatoryFieldsChange}
                    options={builtInFieldKeys.map(key => ({
                      label: <span style={{ color: "#ffffff", fontSize: "14px" }}>{builtInAccountFields.find(f => f.key === key)?.label}</span>,
                      value: key,
                    }))}
                    style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                  />
                </div>
              </Form.Item>

              <Divider style={{ borderColor: "#333333" }} />

              {/* Default Visible Fields */}
              <Form.Item label={<span style={{ color: "#ffffff" }}>{t("defaultFieldsForNewSessions")}</span>}>
                <p style={{ fontSize: "13px", color: "#cccccc", marginBottom: "12px", fontWeight: "500" }}>
                  {t("defaultFieldsDescription")}
                </p>
                <div style={{ padding: "12px", background: "#222222", borderRadius: "8px", border: "1px solid #333333" }}>
                  <Checkbox.Group
                    value={defaultVisible}
                    onChange={handleDefaultVisibleChange}
                    options={visibleFields.map(key => ({
                      label: <span style={{ color: "#ffffff", fontSize: "14px" }}>{builtInAccountFields.find(f => f.key === key)?.label}</span>,
                      value: key,
                    }))}
                    style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                  />
                </div>
              </Form.Item>
            </Card>

            {/* CUSTOM FIELDS MANAGEMENT */}
            <Card
              title={
                <span style={{ color: "#ffffff" }}>
                  <span style={{ marginRight: "8px" }}>✨</span>
                  {t("globalCustomFields")}
                </span>
              }
              style={{ marginBottom: "24px", background: "#1a1a1a", borderColor: "#333333" }}
              headStyle={{ background: "#1a1a1a", borderColor: "#333333" }}
            >
              <p style={{ fontSize: "13px", color: "#cccccc", marginBottom: "16px", fontWeight: "500" }}>
                {t("customFieldsDescription")}
              </p>

              {customFields.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  {customFields.map((field, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px",
                        background: "#222222",
                        borderRadius: "8px",
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "1px solid #333333",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, color: "#ffffff" }}>{field.name}</div>
                        {field.description && (
                          <div style={{ fontSize: "13px", color: "#aaaaaa", fontWeight: "500", marginTop: "4px" }}>
                            {field.description}
                          </div>
                        )}
                      </div>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteCustomField(field.name)}
                      />
                    </div>
                  ))}
                  <Divider style={{ borderColor: "#333333" }} />
                </div>
              )}

              <Form.Item label={<span style={{ color: "#ffffff" }}>{t("addNewCustomField")}</span>}>
                <Row gutter={8}>
                  <Col xs={24} sm={10}>
                    <Input
                      placeholder={t("customFieldNamePlaceholder")}
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                    />
                  </Col>
                  <Col xs={24} sm={10}>
                    <Input
                      placeholder={t("customFieldDescriptionPlaceholder")}
                      value={newFieldDesc}
                      onChange={(e) => setNewFieldDesc(e.target.value)}
                    />
                  </Col>
                  <Col xs={24} sm={4}>
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={handleAddCustomField}
                      block
                    >
                      {t("add")}
                    </Button>
                  </Col>
                </Row>
              </Form.Item>
            </Card>

            {/* CATEGORIES & PAYMENT TERMS OPTIONS */}
            <Card
              title={
                <span style={{ color: "#ffffff" }}>
                  <span style={{ marginRight: "8px" }}>⚙️</span>
                  {t("categoriesAndPaymentTerms")}
                </span>
              }
              style={{ marginBottom: "24px", background: "#1a1a1a", borderColor: "#333333" }}
              headStyle={{ background: "#1a1a1a", borderColor: "#333333" }}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="allowCustomCategories" valuePropName="checked">
                    <div>
                      <div style={{ marginBottom: "8px", fontWeight: 500, color: "#ffffff", fontSize: "14px" }}>
                        {t("allowCustomCategories")}
                      </div>
                      <Switch
                        checkedChildren={t("yes")}
                        unCheckedChildren={t("no")}
                      />
                    </div>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="allowCustomPaymentTerms" valuePropName="checked">
                    <div>
                      <div style={{ marginBottom: "8px", fontWeight: 500, color: "#ffffff", fontSize: "14px" }}>
                        {t("allowCustomPaymentTerms")}
                      </div>
                      <Switch
                        checkedChildren={t("yes")}
                        unCheckedChildren={t("no")}
                      />
                    </div>
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item name="allowMultipleCategories" valuePropName="checked">
                    <div>
                      <div style={{ marginBottom: "8px", fontWeight: 500, color: "#ffffff", fontSize: "14px" }}>
                        {t("allowMultipleCategories")}
                      </div>
                      <Switch
                        checkedChildren={t("yes")}
                        unCheckedChildren={t("no")}
                      />
                    </div>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* SAVE BUTTON */}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                size="large"
                style={{ minWidth: "200px" }}
              >
                {t("saveSettings")}
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </div>
    </div>
  );
}
