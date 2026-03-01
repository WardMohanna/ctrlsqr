"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  InputNumber,
  Table,
  Modal,
  Divider,
} from "antd";
import {
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";

interface Product {
  _id: string;
  itemName: string;
  category: string;
  currentClientPrice: number;
  quantity: number;
}

interface Account {
  _id: string;
  officialEntityName: string;
  taxId: string;
}

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
}

export default function B2BSellPage() {
  const router = useRouter();
  const t = useTranslations("b2b.sell");
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [notes, setNotes] = useState("");

  // Fetch accounts and products
  useEffect(() => {
    fetchDropdownData();
  }, []);

  async function fetchDropdownData() {
    try {
      const [accountsRes, productsRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/inventory?category=FinalProduct,SemiFinalProduct,ProductionRawMaterial,CoffeeshopRawMaterial,WorkShopRawMaterial,CleaningMaterial,Packaging,DisposableEquipment"),
      ]);

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data);
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  }

  const handleAddItem = (product: Product) => {
    const newItem: SaleItem = {
      productId: product._id,
      productName: product.itemName,
      quantity: 1,
      unitPrice: product.currentClientPrice || 0,
      lineDiscount: 0,
    };

    setSaleItems([...saleItems, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...saleItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSaleItems(newItems);
  };

  const calculateLineTotal = (item: SaleItem) => {
    return item.quantity * item.unitPrice - item.lineDiscount;
  };

  const calculateTotalBeforeDiscount = () => {
    return saleItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  const calculateFinalTotal = () => {
    return calculateTotalBeforeDiscount() - totalDiscount;
  };

  async function handleSubmit() {
    if (!selectedAccount) {
      messageApi.error(t("selectAccountError"));
      return;
    }

    if (saleItems.length === 0) {
      messageApi.error(t("addItemsError"));
      return;
    }

    setLoading(true);

    try {
      const payload = {
        accountId: selectedAccount,
        items: saleItems,
        totalDiscount,
        notes,
      };

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "createError");
      }

      const newSale = await response.json();
      messageApi.success(t("createSuccess"));

      // Reset form
      form.resetFields();
      setSaleItems([]);
      setSelectedAccount("");
      setTotalDiscount(0);
      setNotes("");

      // Redirect to account history
      setTimeout(() => {
        router.push(`/accounts/${selectedAccount}/history`);
      }, 300);
    } catch (err: any) {
      const errorKey = err.message || "createError";
      messageApi.error(t(errorKey), 5);
    } finally {
      setLoading(false);
    }
  }

  const itemsTableColumns = [
    {
      title: t("product"),
      dataIndex: "productName",
      key: "productName",
    },
    {
      title: t("quantity"),
      key: "quantity",
      render: (text: any, record: SaleItem, index: number) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(value) =>
            handleItemChange(index, "quantity", value || 1)
          }
        />
      ),
    },
    {
      title: t("unitPrice"),
      key: "unitPrice",
      render: (text: any, record: SaleItem, index: number) => (
        <InputNumber
          min={0}
          step={0.01}
          value={record.unitPrice}
          onChange={(value) => handleItemChange(index, "unitPrice", value || 0)}
        />
      ),
    },
    {
      title: t("lineDiscount"),
      key: "lineDiscount",
      render: (text: any, record: SaleItem, index: number) => (
        <InputNumber
          min={0}
          step={0.01}
          value={record.lineDiscount}
          onChange={(value) =>
            handleItemChange(index, "lineDiscount", value || 0)
          }
        />
      ),
    },
    {
      title: t("total"),
      key: "total",
      render: (text: any, record: SaleItem) =>
        `$${calculateLineTotal(record).toFixed(2)}`,
    },
    {
      title: t("actions"),
      key: "actions",
      render: (text: any, record: SaleItem, index: number) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(index)}
        >
          {t("remove")}
        </Button>
      ),
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
      {contextHolder}
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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

            {/* ACCOUNT SELECTION */}
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
                {t("selectAccount")}
              </h2>
              <Select
                placeholder={t("selectAccountPlaceholder")}
                style={{ width: "100%" }}
                size="large"
                value={selectedAccount || undefined}
                onChange={(value) => setSelectedAccount(value)}
              >
                {accounts.map((account) => (
                  <Select.Option key={account._id} value={account._id}>
                    {account.officialEntityName} ({account.taxId})
                  </Select.Option>
                ))}
              </Select>
            </div>

            <Divider />

            {/* ADD ITEMS */}
            {selectedAccount && (
              <div style={{ marginBottom: "32px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
                  {t("addItems")}
                </h2>

                <Select
                  placeholder={t("selectProductPlaceholder")}
                  style={{ marginBottom: "16px" }}
                  optionLabelProp="label"
                >
                  {products.map((product) => (
                    <Select.Option
                      key={product._id}
                      value={product._id}
                      label={product.itemName}
                    >
                      <div
                        onClick={() => handleAddItem(product)}
                        style={{ cursor: "pointer" }}
                      >
                        {product.itemName} - Stock: {product.quantity}
                      </div>
                    </Select.Option>
                  ))}
                </Select>

                {saleItems.length > 0 && (
                  <>
                    <Table
                      columns={itemsTableColumns}
                      dataSource={saleItems}
                      rowKey="productName"
                      pagination={false}
                      scroll={{ x: 1000 }}
                    />
                  </>
                )}
              </div>
            )}

            {saleItems.length > 0 && (
              <>
                <Divider />

                {/* DISCOUNTS AND SUMMARY */}
                <div style={{ marginBottom: "32px" }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
                    {t("discountAndNotes")}
                  </h2>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <label style={{ display: "block", marginBottom: "8px" }}>
                        {t("globalDiscount")}
                      </label>
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        step={0.01}
                        value={totalDiscount}
                        onChange={(value) => setTotalDiscount(value || 0)}
                      />
                    </Col>
                  </Row>

                  <Row gutter={16} style={{ marginTop: "16px" }}>
                    <Col xs={24}>
                      <label style={{ display: "block", marginBottom: "8px" }}>
                        {t("notes")}
                      </label>
                      <Input.TextArea
                        rows={4}
                        placeholder={t("notesPlaceholder")}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </Col>
                  </Row>
                </div>

                <Divider />

                {/* SUMMARY */}
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "8px",
                    marginBottom: "32px",
                  }}
                >
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <p>{t("subtotal")}:</p>
                      <h3>${calculateTotalBeforeDiscount().toFixed(2)}</h3>
                    </Col>
                    <Col xs={24} md={8}>
                      <p>{t("totalDiscount")}:</p>
                      <h3>${totalDiscount.toFixed(2)}</h3>
                    </Col>
                    <Col xs={24} md={8}>
                      <p>{t("finalTotal")}:</p>
                      <h3 style={{ color: "green" }}>
                        ${calculateFinalTotal().toFixed(2)}
                      </h3>
                    </Col>
                  </Row>
                </div>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    block
                    size="large"
                    loading={loading}
                    icon={<SaveOutlined />}
                    onClick={handleSubmit}
                  >
                    {t("saveSale")}
                  </Button>
                </Form.Item>
              </>
            )}
          </Card>
        </Space>
      </div>
    </div>
  );
}
