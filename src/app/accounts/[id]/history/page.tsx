"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Table, Card, Space, message, Button, Drawer, Descriptions } from "antd";
import { ArrowLeftOutlined, EyeOutlined } from "@ant-design/icons";
import BackButton from "@/components/BackButton";

interface SaleItem {
  productName: string;
  productType: string;
  quantity: number;
  unitPriceSnapshot: number;
  lineDiscount: number;
  lineTotal: number;
}

interface Sale {
  _id: string;
  saleNumber: string;
  saleDate: string;
  totalBeforeDiscount: number;
  totalDiscount: number;
  finalTotal: number;
  notes?: string;
  items: SaleItem[];
}

interface Account {
  _id: string;
  officialEntityName: string;
  taxId: string;
  category: string;
}

export default function AccountHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;
  const t = useTranslations("accounts.history");
  const [account, setAccount] = useState<Account | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch account and sales
  useEffect(() => {
    fetchData();
  }, [accountId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [accountRes, salesRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}`),
        fetch(`/api/sales?accountId=${accountId}`),
      ]);

      if (accountRes.ok) {
        const data = await accountRes.json();
        setAccount(data);
      } else {
        messageApi.error(t("accountNotFound"));
      }

      if (salesRes.ok) {
        const data = await salesRes.json();
        setSales(data);
      }
    } catch (error) {
      messageApi.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    {
      title: t("saleNumber"),
      dataIndex: "saleNumber",
      key: "saleNumber",
      sorter: (a: Sale, b: Sale) => a.saleNumber.localeCompare(b.saleNumber),
    },
    {
      title: t("date"),
      dataIndex: "saleDate",
      key: "saleDate",
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: Sale, b: Sale) =>
        new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime(),
    },
    {
      title: t("totalBeforeDiscount"),
      dataIndex: "totalBeforeDiscount",
      key: "totalBeforeDiscount",
      render: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      title: t("discount"),
      dataIndex: "totalDiscount",
      key: "totalDiscount",
      render: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      title: t("finalTotal"),
      dataIndex: "finalTotal",
      key: "finalTotal",
      render: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      title: t("actions"),
      key: "actions",
      render: (text: any, record: Sale) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedSale(record);
            setDrawerOpen(true);
          }}
        >
          {t("viewDetails")}
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
            {account && (
              <>
                <h1
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    textAlign: "center",
                    marginBottom: "8px",
                  }}
                >
                  {account.officialEntityName}
                </h1>
                <p
                  style={{
                    textAlign: "center",
                    color: "#666",
                    marginBottom: "24px",
                  }}
                >
                  {t("taxIdLabel")}: {account.taxId}
                </p>
              </>
            )}

            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
              {t("salesHistory")}
            </h2>

            {sales.length === 0 ? (
              <p style={{ textAlign: "center", color: "#999" }}>
                {t("noSales")}
              </p>
            ) : (
              <Table
                columns={columns}
                dataSource={sales}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1000 }}
              />
            )}
          </Card>
        </Space>
      </div>

      {/* SALE DETAILS DRAWER */}
      <Drawer
        title={`${t("saleDetails")} - ${selectedSale?.saleNumber}`}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={500}
      >
        {selectedSale && (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Descriptions bordered size="small">
              <Descriptions.Item label={t("saleNumber")}>
                {selectedSale.saleNumber}
              </Descriptions.Item>
              <Descriptions.Item label={t("date")}>
                {new Date(selectedSale.saleDate).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label={t("totalBeforeDiscount")}>
                ${selectedSale.totalBeforeDiscount.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label={t("discount")}>
                ${selectedSale.totalDiscount.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label={t("finalTotal")}>
                <strong>${selectedSale.finalTotal.toFixed(2)}</strong>
              </Descriptions.Item>
            </Descriptions>

            <div>
              <h4>{t("items")}</h4>
              <Table
                columns={[
                  {
                    title: t("product"),
                    dataIndex: "productName",
                    key: "productName",
                  },
                  {
                    title: t("quantity"),
                    dataIndex: "quantity",
                    key: "quantity",
                  },
                  {
                    title: t("unitPrice"),
                    dataIndex: "unitPriceSnapshot",
                    key: "unitPriceSnapshot",
                    render: (v) => `$${v.toFixed(2)}`,
                  },
                  {
                    title: t("total"),
                    dataIndex: "lineTotal",
                    key: "lineTotal",
                    render: (v) => `$${v.toFixed(2)}`,
                  },
                ]}
                dataSource={selectedSale.items}
                rowKey="productName"
                pagination={false}
                size="small"
              />
            </div>

            {selectedSale.notes && (
              <div>
                <h4>{t("notes")}</h4>
                <p>{selectedSale.notes}</p>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
}
