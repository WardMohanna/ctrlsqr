"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Papa from "papaparse";
import {
  Table,
  Button,
  Card,
  Space,
  Modal,
  message,
  Input,
  Select,
  Row,
  Col,
  Form,
  Typography,
  Checkbox,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import { useTheme } from "@/hooks/useTheme";
import { builtInAccountFields, defaultVisibleAccountFields } from "@/lib/accountFields";

interface Account {
  _id: string;
  officialEntityName: string;
  taxId: string;
  category: string;
  city?: string;
  active: boolean;
  customFields?: Array<{ name: string; value: string }>;
  createdAt: string;
}

class AccountsErrorBoundary extends React.Component<Record<string, unknown>, { hasError: boolean }> {
  constructor(props: Record<string, unknown>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("AccountsListPage caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>אירעה שגיאה בטעינת העמוד</h2>
          <p>נא לרענן או לפנות למפתח.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function AccountsListPageContent() {
  const router = useRouter();
  const t = useTranslations("accounts.list");
  const { theme } = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [categories, setCategories] = useState([]);

  const [selectedFields, setSelectedFields] = useState<string[]>(
    defaultVisibleAccountFields,
  );
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [newCustomFieldName, setNewCustomFieldName] = useState("");

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview">("upload");
  const [parsedAccounts, setParsedAccounts] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [editingAccountIndex, setEditingAccountIndex] = useState<number | null>(null);
  const [importForm] = Form.useForm();

  // Fetch accounts list
  useEffect(() => {
    fetchAccounts();
    fetchCategories();

    const saved = localStorage.getItem("accountsFieldConfig");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.selectedFields) && parsed.selectedFields.length > 0) {
          setSelectedFields(parsed.selectedFields);
        }
        if (Array.isArray(parsed.customFields)) {
          setCustomFields(parsed.customFields);
        }
      } catch (error) {
        console.warn("Failed to parse accountsFieldConfig", error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "accountsFieldConfig",
      JSON.stringify({ selectedFields, customFields }),
    );
  }, [selectedFields, customFields]);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      messageApi.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const response = await fetch("/api/account-categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: t("deleteConfirm"),
      content: `${t("deleteMessage")} "${name}"?`,
      okText: t("delete"),
      okType: "danger",
      cancelText: t("cancel"),
      onOk: async () => {
        try {
          const response = await fetch(`/api/accounts/${id}`, {
            method: "DELETE",
          });

          if (response.ok) {
            messageApi.success(t("deleteSuccess"));
            fetchAccounts();
          } else {
            messageApi.error(t("deleteError"));
          }
        } catch (error) {
          messageApi.error(t("deleteError"));
        }
      },
    });
  };

  const resetImportState = () => {
    setImportStep("upload");
    setParsedAccounts([]);
    setImportErrors([]);
    setEditingAccountIndex(null);
    importForm.resetFields();
  };

  const handleOpenImportModal = () => {
    resetImportState();
    setIsImportModalOpen(true);
  };

  const parseCsvFile = (file: File) => {
    setImportErrors([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const parsed: any[] = [];
        const errors: string[] = [];
        const taxIds = new Set<string>();

        if (results.errors.length > 0) {
          results.errors.forEach((err) => {
            errors.push(`שגיאת CSV בשורה ${err.row + 1}: ${err.message}`);
          });
        }

        (results.data as any[]).forEach((raw, index) => {
          const rowIndex = index + 2; // header row accounted
          const officialEntityName = (raw.officialEntityName || "").toString().trim();
          const taxId = (raw.taxId || "").toString().trim();
          const category = (raw.category || "").toString().trim();

          if (!officialEntityName || !taxId || !category) {
            errors.push(`שורה ${rowIndex}: חסר officialEntityName או taxId או category`);
            return;
          }

          if (taxIds.has(taxId)) {
            errors.push(`שורה ${rowIndex}: taxId כפול בתוך הקובץ (${taxId})`);
            return;
          }

          taxIds.add(taxId);

          const row = {
            officialEntityName,
            taxId,
            category,
            city: (raw.city || "").toString().trim(),
            address: (raw.address || "").toString().trim(),
            active:
              raw.active === undefined || raw.active === ""
                ? true
                : /^\s*(1|true|כן|Yes)\s*$/i.test(raw.active.toString()),
            paymentTerms: (raw.paymentTerms || "").toString().trim(),
            creditLimit: raw.creditLimit ? Number(raw.creditLimit) : undefined,
            key: `${taxId}-${rowIndex}`,
          };

          if (row.creditLimit !== undefined && Number.isNaN(row.creditLimit)) {
            errors.push(`שורה ${rowIndex}: creditLimit לא מספרי`);
            return;
          }

          parsed.push(row);
        });

        if (errors.length > 0) {
          setImportErrors(errors);
          return;
        }

        if (parsed.length === 0) {
          setImportErrors(["לא נמצאו שורות תקינות לייבוא"]);
          return;
        }

        setParsedAccounts(parsed);
        setImportStep("preview");
      },
      error: (error) => {
        setImportErrors([`שגיאת קריאה: ${error.message}`]);
      },
    });
  };

  const handleFinalizeImport = async () => {
    setIsImporting(true);
    const importResults: string[] = [];
    let successCount = 0;

    for (const row of parsedAccounts) {
      try {
        const response = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            officialEntityName: row.officialEntityName,
            taxId: row.taxId,
            category: row.category,
            city: row.city,
            address: row.address,
            active: row.active,
            paymentTerms: row.paymentTerms,
            creditLimit: row.creditLimit,
          }),
        });

        if (response.ok) {
          successCount += 1;
        } else {
          const data = await response.json();
          importResults.push(`taxId ${row.taxId}: ${data.error || response.statusText}`);
        }
      } catch (error) {
        importResults.push(`taxId ${row.taxId}: ${error}`);
      }
    }

    setIsImporting(false);

    if (successCount > 0) {
      messageApi.success(`ייבוא ${successCount} לקוחות בוצע בהצלחה`);
      await fetchAccounts();
      setIsImportModalOpen(false);
      resetImportState();
    }

    if (importResults.length > 0) {
      Modal.error({
        title: "שגיאות בייבוא CSV",
        content: (
          <div>
            {importResults.map((errorLine, idx) => (
              <div key={idx}>{errorLine}</div>
            ))}
          </div>
        ),
      });
    }
  };

  const handleStartEditRow = (index: number) => {
    setEditingAccountIndex(index);
    importForm.setFieldsValue(parsedAccounts[index]);
  };

  const handleSaveEditedRow = () => {
    importForm
      .validateFields()
      .then((values) => {
        if (editingAccountIndex === null) return;

        const updated = [...parsedAccounts];
        updated[editingAccountIndex] = {
          ...updated[editingAccountIndex],
          ...values,
          active:
            values.active === undefined
              ? true
              : typeof values.active === "string"
              ? /^\s*(1|true|כן|Yes)\s*$/i.test(values.active)
              : Boolean(values.active),
        };

        setParsedAccounts(updated);
        setEditingAccountIndex(null);
        messageApi.success("העריכה נשמרה");
      })
      .catch(() => {
        messageApi.error("יש למלא את כל השדות הנדרשים");
      });
  };

  // Filter accounts based on search and filters
  const accountsWithCustom = accounts.map((account) => ({
    ...account,
    ...(Array.isArray(account.customFields)
      ? Object.fromEntries(account.customFields.map((field) => [field.name, field.value]))
      : {}),
  }));

  const filteredAccounts = accountsWithCustom.filter((account) => {
    const matchesSearch =
      account.officialEntityName
        .toLowerCase()
        .includes(searchText.toLowerCase()) ||
      account.taxId.toLowerCase().includes(searchText.toLowerCase());

    const matchesCategory =
      !filterCategory || account.category === filterCategory;

    const matchesActive =
      !filterActive ||
      (filterActive === "true" ? account.active : !account.active);

    return matchesSearch && matchesCategory && matchesActive;
  });

  const columnTemplates = [
    {
      title: t("entityName"),
      dataIndex: "officialEntityName",
      key: "officialEntityName",
      sorter: (a: Account, b: Account) =>
        a.officialEntityName.localeCompare(b.officialEntityName),
    },
    {
      title: t("taxId"),
      dataIndex: "taxId",
      key: "taxId",
    },
    {
      title: t("category"),
      dataIndex: "category",
      key: "category",
      filters: categories.map((cat: any) => ({
        text: cat.name,
        value: cat.name,
      })),
      onFilter: (value: any, record: Account) => record.category === value,
    },
    {
      title: t("city"),
      dataIndex: "city",
      key: "city",
    },
    {
      title: t("status"),
      dataIndex: "active",
      key: "active",
      render: (active: boolean) => (
        <span style={{ color: active ? "green" : "red" }}>
          {active ? t("active") : t("inactive")}
        </span>
      ),
      filters: [
        { text: t("active"), value: true },
        { text: t("inactive"), value: false },
      ],
      onFilter: (value: any, record: Account) => record.active === value,
    },
    {
      title: t("contacts"),
      dataIndex: "contacts",
      key: "contacts",
      render: (contacts: any[]) => (contacts?.length || 0),
    },
    {
      title: t("paymentTerms"),
      dataIndex: "paymentTerms",
      key: "paymentTerms",
    },
    {
      title: t("creditLimit"),
      dataIndex: "creditLimit",
      key: "creditLimit",
    },
  ];

  const actionColumn = {
    title: t("actions"),
    key: "actions",
    fixed: "right",
    width: 220,
    render: (text: any, record: Account) => (
      <Space>
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          data-return-path={`/accounts/${record._id}/history`}
          onClick={() => router.push(`/accounts/${record._id}/history`)}
        >
          {t("history")}
        </Button>
        <Button
          type="default"
          size="small"
          icon={<EditOutlined />}
          data-return-path={`/accounts/${record._id}/edit`}
          onClick={() => router.push(`/accounts/${record._id}/edit`)}
        >
          {t("edit")}
        </Button>
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record._id, record.officialEntityName)}
        >
          {t("delete")}
        </Button>
      </Space>
    ),
  };

  const columns = [
    ...columnTemplates.filter((col) =>
      selectedFields.includes(col.dataIndex as string),
    ),
    ...customFields.map((field) => ({
      title: field,
      dataIndex: field,
      key: field,
    })),
    actionColumn,
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
        padding: "clamp(12px, 3vw, 24px)",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <BackButton onClick={() => router.push("/mainMenu")} size="large">
              {t("back")}
            </BackButton>
            <Space>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                data-return-path="/accounts/add"
                onClick={() => router.push("/accounts/add")}
              >
                {t("addAccount")}
              </Button>
              <Button
                type="default"
                size="large"
                icon={<UploadOutlined />}
                onClick={handleOpenImportModal}
              >
                ייבוא CSV
              </Button>
            </Space>
          </div>

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
                marginBottom: "24px",
              }}
            >
              {t("title")}
            </h1>

            <Card type="inner" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Select visible fields</div>
              <Checkbox.Group
                value={selectedFields}
                onChange={(values) => setSelectedFields(values as string[])}
                options={builtInAccountFields.map((field) => ({
                  label: field.label,
                  value: field.key,
                }))}
              />

              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Input
                  placeholder="Custom field key"
                  value={newCustomFieldName}
                  onChange={(e) => setNewCustomFieldName(e.target.value)}
                  style={{ width: 180 }}
                />
                <Button
                  type="dashed"
                  onClick={() => {
                    const key = newCustomFieldName.trim();
                    if (!key) {
                      messageApi.error("Field name required");
                      return;
                    }
                    if (builtInAccountFields.some((f) => f.key === key) || customFields.includes(key)) {
                      messageApi.error("Field already exists");
                      return;
                    }
                    setCustomFields((prev) => [...prev, key]);
                    setSelectedFields((prev) => [...prev, key]);
                    setNewCustomFieldName("");
                  }}
                >
                  Add custom field
                </Button>
              </div>
            </Card>

            {/* FILTERS */}
            <Row gutter={16} style={{ marginBottom: "24px" }}>
              <Col xs={24} md={8}>
                <Input
                  placeholder={t("searchPlaceholder")}
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </Col>
              <Col xs={24} md={8}>
                <Select
                  allowClear
                  placeholder={t("filterCategory")}
                  value={filterCategory || undefined}
                  onChange={(value) => setFilterCategory(value || "")}
                  style={{ width: "100%" }}
                >
                  {categories.map((cat: any) => (
                    <Select.Option key={cat._id} value={cat.name}>
                      {cat.name}
                    </Select.Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} md={8}>
                <Select
                  allowClear
                  placeholder={t("filterStatus")}
                  value={filterActive || undefined}
                  onChange={(value) => setFilterActive(value || "")}
                  style={{ width: "100%" }}
                >
                  <Select.Option value="true">{t("active")}</Select.Option>
                  <Select.Option value="false">{t("inactive")}</Select.Option>
                </Select>
              </Col>
            </Row>

            {/* TABLE */}
            <Table
              columns={columns}
              dataSource={filteredAccounts}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10, total: filteredAccounts.length }}
              scroll={{ x: 1000 }}
            />

            <Modal
              title={importStep === "upload" ? "ייבוא לקוחות מ-CSV" : "סקירת ייבוא לקוחות"}
              open={isImportModalOpen}
              onCancel={() => setIsImportModalOpen(false)}
              width={800}
              footer={
                importStep === "preview"
                  ? [
                      <Button key="back" onClick={() => setImportStep("upload")}>
                        חזור
                      </Button>,
                      <Button
                        key="import"
                        type="primary"
                        loading={isImporting}
                        onClick={handleFinalizeImport}
                      >
                        ייבא לקוחות
                      </Button>,
                    ]
                  : null
              }
            >
              {importStep === "upload" ? (
                <div>
                  <Typography.Title level={5}>פורמט קובץ CSV</Typography.Title>
                  <Typography.Paragraph>
                    יש לשלוח קובץ CSV שבו השורה הראשונה היא כותרת (header), והעמודות הן (בדיוק בסדר הזה):
                    <ul>
                      <li><strong>officialEntityName</strong> (חובה)</li>
                      <li><strong>taxId</strong> (חובה, ייחודי)</li>
                      <li><strong>category</strong> (חובה)</li>
                      <li><strong>city</strong> (לא חובה)</li>
                      <li><strong>address</strong> (לא חובה)</li>
                      <li><strong>active</strong> (true/false או 1/0, ברירת מחדל true אם ריק)</li>
                      <li><strong>paymentTerms</strong> (לא חובה)</li>
                      <li><strong>creditLimit</strong> (לא חובה, מספר)</li>
                    </ul>
                  </Typography.Paragraph>
                  <Typography.Paragraph>
                    דוגמה לטבלה המייצגת את הקובץ (השורה הראשונה היא הכותרת):
                  </Typography.Paragraph>
                  <Table
                    columns={[
                      { title: "officialEntityName", dataIndex: "officialEntityName", key: "officialEntityName" },
                      { title: "taxId", dataIndex: "taxId", key: "taxId" },
                      { title: "category", dataIndex: "category", key: "category" },
                      { title: "city", dataIndex: "city", key: "city" },
                      { title: "address", dataIndex: "address", key: "address" },
                      { title: "active", dataIndex: "active", key: "active" },
                      { title: "paymentTerms", dataIndex: "paymentTerms", key: "paymentTerms" },
                      { title: "creditLimit", dataIndex: "creditLimit", key: "creditLimit" },
                    ]}
                    dataSource={[
                      {
                        key: "example-row",
                        officialEntityName: "חנות בית קפה",
                        taxId: "123456789",
                        category: "ספק",
                        city: "חיפה",
                        address: "רחוב הראשי 10",
                        active: "true",
                        paymentTerms: "30 ימים",
                        creditLimit: "5000",
                      },
                    ]}
                    pagination={false}
                    size="small"
                    style={{ marginBottom: 16 }}
                  />
                  <Typography.Text type="secondary">
                    לדוגמה, זאת השורה שניתן לשים בקובץ CSV:
                  </Typography.Text>
                  <Typography.Paragraph code>
                    חנות בית קפה,123456789,ספק,חיפה,רחוב הראשי 10,true,30 ימים,5000
                  </Typography.Paragraph>
                  <Typography.Paragraph>
                    לאחר ההעלאה, אם יש שגיאות בפורמט או בשורות, תוצג רשימת שגיאות. אם הכל תקין, תוכל לעבור לצפייה ועריכה לפני אישור סופי לייבוא.
                  </Typography.Paragraph>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        parseCsvFile(file);
                      }
                    }}
                  />
                  {importErrors.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <Typography.Text type="danger">שגיאות בקריאת הקובץ:</Typography.Text>
                      <ul>
                        {importErrors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Typography.Paragraph>
                    וודא את הנתונים לפני הייבוא הסופי. ניתן לערוך שורה באמצעות לחצן &quot;ערוך&quot;.
                  </Typography.Paragraph>
                  <Table
                    size="small"
                    columns={[
                      { title: "שם", dataIndex: "officialEntityName", key: "officialEntityName" },
                      { title: "ח.פ./ת.ז", dataIndex: "taxId", key: "taxId" },
                      { title: "קטגוריה", dataIndex: "category", key: "category" },
                      { title: "עיר", dataIndex: "city", key: "city" },
                      {
                        title: "פעיל",
                        dataIndex: "active",
                        key: "active",
                        render: (active) => (active ? "כן" : "לא"),
                      },
                      {
                        title: "פעולות",
                        key: "actions",
                        render: (_text, record, index) => (
                          <Button size="small" onClick={() => handleStartEditRow(index)}>
                            ערוך
                          </Button>
                        ),
                      },
                    ]}
                    dataSource={parsedAccounts}
                    pagination={false}
                    rowKey={(row) => row.key}
                  />

                  <Modal
                    title="עריכת שורה"
                    open={editingAccountIndex !== null}
                    onCancel={() => setEditingAccountIndex(null)}
                    onOk={handleSaveEditedRow}
                  >
                    <Form form={importForm} layout="vertical">
                      <Form.Item
                        label="officialEntityName"
                        name="officialEntityName"
                        rules={[{ required: true, message: "נדרש officialEntityName" }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        label="taxId"
                        name="taxId"
                        rules={[{ required: true, message: "נדרש taxId" }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        label="category"
                        name="category"
                        rules={[{ required: true, message: "נדרש category" }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item label="city" name="city">
                        <Input />
                      </Form.Item>
                      <Form.Item label="address" name="address">
                        <Input />
                      </Form.Item>
                      <Form.Item label="active" name="active">
                        <Select>
                          <Select.Option value={true}>כן</Select.Option>
                          <Select.Option value={false}>לא</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item label="paymentTerms" name="paymentTerms">
                        <Input />
                      </Form.Item>
                      <Form.Item label="creditLimit" name="creditLimit">
                        <Input />
                      </Form.Item>
                    </Form>
                  </Modal>
                </div>
              )}
            </Modal>
          </Card>
        </Space>
      </div>
    </div>
  );
}

export default function AccountsListPage() {
  return (
    <AccountsErrorBoundary>
      <AccountsListPageContent />
    </AccountsErrorBoundary>
  );
}
