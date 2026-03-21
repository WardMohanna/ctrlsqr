// app/supplier/edit/page.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { RestoreFormModal } from "@/components/RestoreFormModal";
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
import BackButton from "@/components/BackButton";

interface Supplier {
  _id: string;
  name: string;
}

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 15;

export default function EditSupplierPage() {
  const router = useRouter();
  const goUp = useNavigateUp();
  const t = useTranslations("supplier.edit");
  const { theme } = useTheme();
  const [form] = Form.useForm();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [hasMoreSuppliers, setHasMoreSuppliers] = useState(true);
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [formChanged, setFormChanged] = useState(false);
  const initialFormValues = useRef<any>(null);
  const restoredFormValues = useRef<any>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mergeUniqueSuppliers = useCallback(
    (currentSuppliers: Supplier[], nextSuppliers: Supplier[]) => {
      const supplierMap = new Map(
        currentSuppliers.map((supplier) => [supplier._id, supplier]),
      );

      for (const supplier of nextSuppliers) {
        supplierMap.set(supplier._id, supplier);
      }

      return Array.from(supplierMap.values());
    },
    [],
  );

  // Form persistence hook
  const {
    showRestoreModal,
    handleRestoreConfirm,
    handleRestoreCancel,
    saveFormData,
    clearSavedData,
  } = useFormPersistence({
    formKey: "supplier-edit",
    form,
    additionalData: { selectedId },
    onRestore: (data) => {
      if (data.selectedId) {
        // Store the restored form values to apply after loading
        restoredFormValues.current = form.getFieldsValue();
        setSelectedId(data.selectedId);
      }
    },
  });

  const loadSupplierOptions = useCallback(
    async (searchTerm = "", page = 1, append = false) => {
      if (loadingSuppliers) {
        return;
      }

      setLoadingSuppliers(true);

      try {
        const params = new URLSearchParams({
          paginated: "true",
          page: String(page),
          limit: String(PAGE_SIZE),
          fields: "_id,name",
        });

        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }

        const res = await fetch(`/api/supplier?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load suppliers");
        }

        const data = await res.json();
        const nextSuppliers = data.items ?? [];
        setSuppliers((currentSuppliers) =>
          append
            ? mergeUniqueSuppliers(currentSuppliers, nextSuppliers)
            : nextSuppliers,
        );
        setSupplierPage(page);
        setSupplierSearchTerm(searchTerm);
        setHasMoreSuppliers(page * PAGE_SIZE < (data.total ?? 0));
      } catch (err) {
        console.error(err);
        messageApi.error(t("loadError"));
      } finally {
        setLoadingSuppliers(false);
      }
    },
    [loadingSuppliers, mergeUniqueSuppliers, messageApi, t],
  );

  const handleSupplierSearch = useCallback(
    (value: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        loadSupplierOptions(value, 1, false);
      }, SEARCH_DEBOUNCE_MS);
    },
    [loadSupplierOptions],
  );

  const handleSupplierPopupScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.target as HTMLDivElement;
      const isNearBottom =
        target.scrollTop + target.clientHeight >= target.scrollHeight - 24;

      if (!isNearBottom || loadingSuppliers || !hasMoreSuppliers) {
        return;
      }

      loadSupplierOptions(supplierSearchTerm, supplierPage + 1, true);
    },
    [hasMoreSuppliers, loadSupplierOptions, loadingSuppliers, supplierPage, supplierSearchTerm],
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
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
        setSuppliers((currentSuppliers) => {
          if (currentSuppliers.some((currentSupplier) => currentSupplier._id === supplier._id)) {
            return currentSuppliers;
          }

          return [
            { _id: supplier._id, name: supplier.name ?? "" },
            ...currentSuppliers,
          ];
        });

        const values = {
          name: supplier.name ?? "",
          contactName: supplier.contactName ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          taxId: supplier.taxId ? supplier.taxId : undefined,
          paymentTerms: supplier.paymentTerms ?? "",
        };

        // If we have restored values, use them instead of API values
        if (restoredFormValues.current) {
          form.setFieldsValue(restoredFormValues.current);
          initialFormValues.current = values; // Keep original as initial for comparison
          restoredFormValues.current = null; // Clear after applying
        } else {
          form.setFieldsValue(values);
          initialFormValues.current = values;
          setFormChanged(false);
        }
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
      clearSavedData();
      setTimeout(() => {
        router.push("/mainMenu");
      }, 300);
    } catch (err: any) {
      console.error(err);
      messageApi.error(err.message);
    }
  }

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <BackButton onClick={goUp}>{t("back")}</BackButton>
        </div>
        <Card className={theme === "dark" ? "supplier-edit-card-dark" : ""}>
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                margin: 0,
                textAlign: "center",
              }}
            >
              {t("title")}
            </h1>

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
                  setSelectedId(value || "");
                  form.resetFields();
                  setFormChanged(false);
                }}
                onFocus={() => {
                  if (suppliers.length === 0) {
                    loadSupplierOptions("", 1, false);
                  }
                }}
                onPopupScroll={handleSupplierPopupScroll}
                onSearch={handleSupplierSearch}
                placeholder={t("selectPlaceholder")}
                loading={loadingSuppliers}
                showSearch
                filterOption={false}
                notFoundContent={
                  loadingSuppliers
                    ? t("loadingSuppliers", {
                        defaultValue: "Loading suppliers...",
                      })
                    : t("noSuppliersFound", {
                        defaultValue: "No suppliers found.",
                      })
                }
                options={suppliers.map((s) => ({
                  value: s._id,
                  label: s.name,
                }))}
              />
            </div>

            {loadingSupplier ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spin
                  size="large"
                  style={{ color: theme === "dark" ? "#ffffff" : undefined }}
                />
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
                  saveFormData();
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

      <RestoreFormModal
        open={showRestoreModal}
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
        translationKey="supplier.edit"
      />
    </div>
  );
}
