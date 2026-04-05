"use client";

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  Image,
  Descriptions,
  message,
  Spin,
} from "antd";
import {
  SearchOutlined,
  FileTextOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import BackButton from "@/components/BackButton";
import type { ColumnsType } from "antd/es/table";

interface InvoiceItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  cost: number;
  unit?: string;
}

interface SupplierInfo {
  _id: string;
  name: string;
}

interface Invoice {
  _id: string;
  documentId: string; // Official doc ID
  documentType: string; // "Invoice" or "DeliveryNote"
  supplier?: SupplierInfo; // Populated from the server (optional now)
  oneTimeSupplier?: string; // For one-time suppliers
  date: string; // e.g. document date
  receivedDate?: string; // Actual received date
  filePaths?: string[]; // If an uploaded file exists
  createdAt?: string; // from mongoose timestamps
  updatedAt?: string;
  items: InvoiceItem[];
  deliveredBy?: string;
  remarks?: string;
}

/**
 * We create a new interface that extends your Invoice
 * with two extra fields: supplierName and totalCost
 */
interface AugmentedInvoice extends Invoice {
  supplierName: string;
  totalCost: number;
  key: string;
}

interface PaginatedInvoicesResponse {
  items: Invoice[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 15;

export default function ShowInvoicesPage() {
  const goUp = useNavigateUp();
  const t = useTranslations("invoice.list");
  const { theme } = useTheme();
  const topRef = useRef<HTMLDivElement | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [hasMoreInvoices, setHasMoreInvoices] = useState(true);

  // Search / Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Multi-select states
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // For the file preview modal
  const [openFilePath, setOpenFilePath] = useState<string | null>(null);
  // For invoice details modal
  const [openInvoice, setOpenInvoice] = useState<AugmentedInvoice | null>(null);

  const [isPdfPreview, setIsPdfPreview] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (currentPage === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        paginated: "true",
        page: String(currentPage),
        limit: String(PAGE_SIZE),
      });

      if (deferredSearchTerm.trim()) {
        params.set("search", deferredSearchTerm.trim());
      }

      if (docTypeFilter) {
        params.set("documentType", docTypeFilter);
      }

      const res = await fetch(`/api/invoice?${params.toString()}`);
      if (!res.ok) {
        throw new Error(t("errorFetching"));
      }

      const data: PaginatedInvoicesResponse = await res.json();
      const nextInvoices = data.items ?? [];
      setInvoices((currentInvoices) =>
        currentPage === 1
          ? nextInvoices
          : [...currentInvoices, ...nextInvoices],
      );
      setTotalInvoices(data.total ?? 0);
      setHasMoreInvoices(currentPage * PAGE_SIZE < (data.total ?? 0));
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError(t("errorLoading"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentPage, deferredSearchTerm, docTypeFilter, t]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    setCurrentPage(1);
    setHasMoreInvoices(true);
  }, [deferredSearchTerm, docTypeFilter]);

  const handleTableScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const isNearBottom =
        target.scrollTop + target.clientHeight >= target.scrollHeight - 24;

      if (!isNearBottom || loading || loadingMore || !hasMoreInvoices) {
        return;
      }

      setCurrentPage((page) => page + 1);
    },
    [hasMoreInvoices, loading, loadingMore],
  );

  // Translate doc type from English to Hebrew
  const translateDocumentType = (type: string) => {
    if (type === "Invoice") {
      return t("invoice", { defaultValue: "חשבונית" });
    } else if (type === "DeliveryNote") {
      return t("deliveryNote", { defaultValue: "תעודת משלוח" });
    }
    return type;
  };

  const handleOpenFile = async (filePath: string) => {
    setOpenFilePath(filePath);
    try {
      const response = await fetch(`/api/uploads/${filePath}`, {
        method: "HEAD",
      });
      if (response.ok) {
        const contentType = response.headers.get("Content-Type");
        setIsPdfPreview(contentType === "application/pdf");
      }
    } catch (error) {
      console.error("Error checking file type:", error);
      setIsPdfPreview(false); // Fallback to rendering as image on error
    }
  };

  // 1) We define an array of AugmentedInvoice so TypeScript
  //    knows about our extra fields (supplierName, totalCost)
  const augmented: AugmentedInvoice[] = useMemo(
    () =>
      invoices.map((inv) => ({
        ...inv,
        key: inv._id,
        supplierName: inv.oneTimeSupplier || inv.supplier?.name || "Unknown",
        totalCost: inv.items.reduce((sum, i) => sum + i.cost * i.quantity, 0),
      })),
    [invoices],
  );

  // Define table columns with sorting and rendering
  const columns: ColumnsType<AugmentedInvoice> = [
    {
      title: t("docId"),
      dataIndex: "documentId",
      key: "documentId",
      sorter: (a, b) => a.documentId.localeCompare(b.documentId),
      render: (text: string) => (
        <span style={{ cursor: "pointer" }}>{text}</span>
      ),
    },
    {
      title: t("supplier"),
      dataIndex: "supplierName",
      key: "supplierName",
      sorter: (a, b) => a.supplierName.localeCompare(b.supplierName),
      render: (text: string) => (
        <span style={{ cursor: "pointer" }}>{text}</span>
      ),
    },
    {
      title: t("documentType"),
      dataIndex: "documentType",
      key: "documentType",
      sorter: (a, b) => a.documentType.localeCompare(b.documentType),
      render: (type: string) => (
        <Tag color={type === "Invoice" ? "blue" : "green"}>
          {translateDocumentType(type)}
        </Tag>
      ),
    },
    {
      title: t("date"),
      dataIndex: "date",
      key: "date",
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      render: (date: string) => date?.slice(0, 10) || "-",
    },
    {
      title: t("totalCost"),
      dataIndex: "totalCost",
      key: "totalCost",
      sorter: (a, b) => a.totalCost - b.totalCost,
      render: (cost: number) => <Tag color="gold">₪{cost.toFixed(2)}</Tag>,
    },
    {
      title: t("file"),
      key: "file",
      render: (_: any, record: AugmentedInvoice) => {
        const filePaths = record.filePaths ?? [];
        if (filePaths.length === 0) return "-";
        return (
          <Space>
            {filePaths.map((fp) => (
              <Button
                key={fp}
                type="primary"
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenFile(fp);
                }}
                size="small"
              >
                {t("view")}
              </Button>
            ))}
          </Space>
        );
      },
    },
    {
      title: t("invoiceDetails"),
      key: "actions",
      render: (_: any, record: AugmentedInvoice) => (
        <Button
          type="primary"
          icon={<FileTextOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            setOpenInvoice(record);
          }}
          style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
        >
          {t("invoiceDetails")}
        </Button>
      ),
    },
  ];

  const handleRowClick = (record: AugmentedInvoice) => {
    return {
      onClick: () => setOpenInvoice(record),
      style: { cursor: "pointer" },
    };
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(
        t("noItemsSelected", {
          defaultValue: "Please select at least one invoice to delete",
        }),
      );
      return;
    }

    Modal.confirm({
      title: t("confirmDelete", { defaultValue: "Confirm Delete" }),
      content: t("confirmDeleteMessage", {
        defaultValue: `Are you sure you want to delete ${selectedRowKeys.length} invoice(s)? This action cannot be undone.`,
        count: selectedRowKeys.length,
      }),
      okText: t("delete", { defaultValue: "Delete" }),
      okType: "danger",
      cancelText: t("cancel", { defaultValue: "Cancel" }),
      onOk: async () => {
        setDeleteLoading(true);
        try {
          const deletePromises = selectedRowKeys.map((id) =>
            fetch(`/api/invoice/${id}`, { method: "DELETE" }),
          );

          const results = await Promise.all(deletePromises);
          const failedDeletes = results.filter((res) => !res.ok);

          if (failedDeletes.length > 0) {
            message.error(
              t("deleteError", {
                defaultValue: "Some invoices could not be deleted",
              }),
            );
          } else {
            message.success(
              t("deleteSuccess", {
                defaultValue: `Successfully deleted ${selectedRowKeys.length} invoice(s)`,
                count: selectedRowKeys.length,
              }),
            );
            setSelectedRowKeys([]);
            setInvoices((currentInvoices) =>
              currentInvoices.filter(
                (invoice) => !selectedRowKeys.includes(invoice._id),
              ),
            );
            setTotalInvoices((currentTotal) => {
              const nextTotal = Math.max(
                currentTotal - selectedRowKeys.length,
                0,
              );
              setHasMoreInvoices(
                nextTotal > invoices.length - selectedRowKeys.length,
              );
              return nextTotal;
            });
          }
        } catch (error) {
          console.error("Error deleting invoices:", error);
          message.error(
            t("deleteError", { defaultValue: "Failed to delete invoices" }),
          );
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [invoices]);

  return (
    <div
      ref={topRef}
      style={{
        padding: "24px",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <BackButton onClick={goUp}>{t("back")}</BackButton>
      </div>
      <Card style={{ background: theme === "dark" ? "#1f1f1f" : "#ffffff" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {t("invoicesTitle")}
          </h1>

          {/* Search and Filter Controls */}
          <Space
            wrap
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Space wrap>
              <Input
                placeholder={t("searchPlaceholder")}
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
              <Select
                placeholder={t("allTypes")}
                value={docTypeFilter || undefined}
                onChange={(value) => setDocTypeFilter(value || "")}
                style={{ width: 200 }}
                allowClear
              >
                <Select.Option value="Invoice">
                  {t("invoice", { defaultValue: "חשבונית" })}
                </Select.Option>
                <Select.Option value="DeliveryNote">
                  {t("deliveryNote", { defaultValue: "תעודת משלוח" })}
                </Select.Option>
              </Select>
            </Space>

            {/* Bulk Actions */}
            {selectedRowKeys.length > 0 && (
              <Space>
                <span style={{ marginRight: 8 }}>
                  {t("selectedCount", {
                    defaultValue: `${selectedRowKeys.length} selected`,
                    count: selectedRowKeys.length,
                  })}
                </span>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBulkDelete}
                  loading={deleteLoading}
                >
                  {t("delete", { defaultValue: "Delete" })}
                </Button>
              </Space>
            )}
          </Space>

          {/* Table */}
          <div
            onScroll={handleTableScroll}
            style={{ maxHeight: "65vh", overflowY: "auto" }}
          >
            <Table
              columns={columns}
              dataSource={augmented}
              loading={loading && invoices.length === 0}
              onRow={handleRowClick}
              rowSelection={rowSelection}
              pagination={false}
              locale={{
                emptyText: error || t("noInvoicesFound"),
              }}
            />
            {loadingMore ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <Spin />
              </div>
            ) : null}
          </div>
        </Space>
      </Card>

      {/* Invoice Details Modal */}
      <Modal
        title={
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>
            {t("invoiceDetails")}
          </span>
        }
        open={!!openInvoice}
        onCancel={() => setOpenInvoice(null)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setOpenInvoice(null)}
          >
            {t("close", { defaultValue: "סגור" })}
          </Button>,
        ]}
        width={800}
      >
        {openInvoice && (
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <Descriptions bordered column={1}>
              <Descriptions.Item label={t("docId")}>
                {openInvoice.documentId}
              </Descriptions.Item>
              <Descriptions.Item label={t("supplier")}>
                {openInvoice.supplierName}
              </Descriptions.Item>
              <Descriptions.Item label={t("documentType")}>
                <Tag
                  color={
                    openInvoice.documentType === "Invoice" ? "blue" : "green"
                  }
                >
                  {translateDocumentType(openInvoice.documentType)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("date")}>
                {openInvoice.date?.slice(0, 10)}
              </Descriptions.Item>
              {openInvoice.receivedDate && (
                <Descriptions.Item label={t("receivedDateLabel")}>
                  {openInvoice.receivedDate.slice(0, 10)}
                </Descriptions.Item>
              )}
              <Descriptions.Item label={t("deliveredByLabel")}>
                {openInvoice.deliveredBy || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t("remarksLabel")}>
                {openInvoice.remarks || "-"}
              </Descriptions.Item>
              <Descriptions.Item
                label={t("attachments", { defaultValue: "Attachments" })}
              >
                {openInvoice.filePaths && openInvoice.filePaths.length > 0 ? (
                  <Space orientation="vertical">
                    {openInvoice.filePaths.map((fp, idx) => (
                      <Button
                        key={fp}
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleOpenFile(fp)}
                      >
                        {t("viewAttachment", {
                          defaultValue: "View Attachment",
                        })}{" "}
                        {openInvoice.filePaths!.length > 1 ? `${idx + 1}` : ""}
                      </Button>
                    ))}
                  </Space>
                ) : (
                  <span style={{ color: "#999" }}>
                    {t("noAttachments", { defaultValue: "No attachments" })}
                  </span>
                )}
              </Descriptions.Item>
            </Descriptions>

            {/* Items Table */}
            <div>
              <h3 style={{ marginBottom: "12px" }}>{t("itemsLabel")}</h3>
              <Table
                dataSource={openInvoice.items.map((item, idx) => ({
                  key: idx,
                  ...item,
                }))}
                columns={[
                  {
                    title: t("item"),
                    dataIndex: "itemName",
                    key: "itemName",
                  },
                  {
                    title: t("qty"),
                    dataIndex: "quantity",
                    key: "quantity",
                    align: "center" as const,
                  },
                  {
                    title: t("unit"),
                    dataIndex: "unit",
                    key: "unit",
                    align: "center" as const,
                    render: (unit: string | undefined) => unit || "-",
                  },
                  {
                    title: t("cost"),
                    dataIndex: "cost",
                    key: "cost",
                    align: "right" as const,
                    render: (cost: number) => `₪${cost.toFixed(2)}`,
                  },
                ]}
                pagination={false}
                size="small"
              />
            </div>
          </Space>
        )}
      </Modal>

      {/* File Preview Modal */}
      <Modal
        title={
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>
            {t("invoicePreview")}
          </span>
        }
        open={!!openFilePath}
        onCancel={() => setOpenFilePath(null)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setOpenFilePath(null)}
          >
            {t("close", { defaultValue: "סגור" })}
          </Button>,
        ]}
        width={800}
        zIndex={1050}
      >
        {openFilePath && (
          <div style={{ maxHeight: "70vh", overflow: "auto" }}>
            {isPdfPreview ? (
              <iframe
                src={`/api/uploads/${openFilePath}`}
                title={t("invoicePreview")}
                style={{ width: "100%", height: "70vh", border: "none" }}
              />
            ) : (
              <Image
                src={`/api/uploads/${openFilePath}`}
                alt={t("invoicePreview")}
                style={{ maxWidth: "100%" }}
                fallback="data:image/png;base64,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"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
