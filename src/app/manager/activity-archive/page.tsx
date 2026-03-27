"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Grid,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/useTheme";
import { useNavigateUp } from "@/hooks/useNavigateUp";
import BackButton from "@/components/BackButton";
import type { Dayjs } from "dayjs";

const { Title, Text } = Typography;

type ArchiveRow = {
  id: string;
  source: string;
  category: string;
  title: string;
  description: string;
  userId: string | null;
  userName: string;
  occurredAt: string;
  status: string;
  referenceId: string;
};

type ArchiveResponse = {
  items: ArchiveRow[];
  summary: {
    total: number;
    sourceCount: number;
    userCount: number;
    sourceCounts: Record<string, number>;
  };
  filters: {
    sources: string[];
    users: { value: string; label: string }[];
  };
};

const sourceColorMap: Record<string, string> = {
  "system-log": "gold",
  "task-session": "blue",
  task: "geekblue",
  "employee-report": "cyan",
  "report-review": "purple",
  invoice: "green",
  sale: "volcano",
  supplier: "lime",
  account: "magenta",
  "page-visit": "orange",
};

export default function ActivityArchivePage() {
  const t = useTranslations("manager.activityArchive");
  const { theme } = useTheme();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  const goUp = useNavigateUp();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [archive, setArchive] = useState<ArchiveResponse | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [userId, setUserId] = useState("all");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const fetchArchive = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "250");
      if (query.trim()) params.set("query", query.trim());
      if (source !== "all") params.set("source", source);
      if (userId !== "all") params.set("userId", userId);
      if (dateRange) {
        params.set("startDate", dateRange[0].format("YYYY-MM-DD"));
        params.set("endDate", dateRange[1].format("YYYY-MM-DD"));
      }

      const response = await fetch(
        `/api/manager/activity-archive?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(t("fetchError"));
      }
      const data = (await response.json()) as ArchiveResponse;
      setArchive(data);
    } catch (error) {
      console.error(error);
      messageApi.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, userId, dateRange]);

  const exportCsv = () => {
    if (!archive) return;
    const headers = [
      "Source",
      "Title",
      "Description",
      "User",
      "Status",
      "Time",
    ];
    const rows = archive.items.map((item) => [
      item.source,
      item.title,
      item.description,
      item.userName,
      item.status,
      new Date(item.occurredAt).toLocaleString(),
    ]);
    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity-archive-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo<ColumnsType<ArchiveRow>>(
    () => [
      {
        title: t("source"),
        dataIndex: "source",
        key: "source",
        width: 150,
        render: (value: string) => (
          <Tag color={sourceColorMap[value] || "default"}>
            {t(`sources.${value}`)}
          </Tag>
        ),
      },
      {
        title: t("title"),
        key: "title",
        render: (_, row) => (
          <Space direction="vertical" size={2}>
            <Text strong>{row.title}</Text>
            <Text type="secondary">{row.description}</Text>
          </Space>
        ),
      },
      {
        title: t("user"),
        dataIndex: "userName",
        key: "userName",
        width: 180,
        responsive: ["md"],
      },
      {
        title: t("status"),
        dataIndex: "status",
        key: "status",
        width: 140,
        responsive: ["lg"],
        render: (value: string) => (
          <Tag>{t(`statuses.${value}`, { defaultValue: value })}</Tag>
        ),
      },
      {
        title: t("time"),
        dataIndex: "occurredAt",
        key: "occurredAt",
        width: 220,
        render: (value: string) => new Date(value).toLocaleString(),
      },
    ],
    [t],
  );

  return (
    <div
      style={{
        padding: isMobile ? "12px" : "24px",
        minHeight: "calc(100vh - 64px)",
        background: theme === "dark" ? "#1f1f1f" : "#ffffff",
      }}
    >
      {contextHolder}
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <Card
          style={{
            borderRadius: isMobile ? 14 : 20,
            background: theme === "dark" ? "#111111" : "#ffffff",
            borderColor: theme === "dark" ? "#2d2d2d" : "#e5e7eb",
          }}
          styles={{
            body: {
              padding: isMobile ? 12 : 24,
            },
          }}
        >
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <BackButton onClick={goUp}>{t("back")}</BackButton>

            <div>
              <Title level={2} style={{ marginBottom: 8 }}>
                {t("pageTitle")}
              </Title>
              <Text type="secondary">{t("pageDescription")}</Text>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={12} sm={8}>
                <Card>
                  <Statistic
                    title={t("totalEvents")}
                    value={archive?.summary.total || 0}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8}>
                <Card>
                  <Statistic
                    title={t("activeSources")}
                    value={archive?.summary.sourceCount || 0}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8}>
                <Card>
                  <Statistic
                    title={t("activeUsers")}
                    value={archive?.summary.userCount || 0}
                  />
                </Card>
              </Col>
            </Row>

            <Space
              wrap
              size={isMobile ? "small" : "middle"}
              style={{ width: "100%" }}
            >
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder={t("searchPlaceholder")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onPressEnter={fetchArchive}
                style={{ width: isMobile ? "100%" : 280 }}
              />
              <Select
                value={source}
                onChange={setSource}
                style={{ minWidth: isMobile ? 170 : 220 }}
                options={[
                  { value: "all", label: t("allSources") },
                  ...((archive?.filters.sources || []).map((value) => ({
                    value,
                    label: t(`sources.${value}`),
                  })) as { value: string; label: string }[]),
                ]}
              />
              <Select
                value={userId}
                onChange={setUserId}
                showSearch
                optionFilterProp="label"
                style={{ minWidth: isMobile ? 170 : 220 }}
                options={[
                  { value: "all", label: t("allUsers") },
                  ...(archive?.filters.users || []),
                ]}
              />
              <DatePicker.RangePicker
                value={dateRange}
                onChange={(range) =>
                  setDateRange(range as [Dayjs, Dayjs] | null)
                }
                allowClear
                style={{ minWidth: isMobile ? 170 : 260 }}
              />
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={fetchArchive}
              >
                {t("refresh")}
              </Button>
              <Button
                icon={<DownloadOutlined />}
                disabled={!archive || archive.items.length === 0}
                onClick={exportCsv}
              >
                {t("exportCsv")}
              </Button>
            </Space>

            {!loading && archive && archive.items.length === 0 ? (
              <Alert type="info" showIcon message={t("noData")} />
            ) : null}

            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={archive?.items || []}
              scroll={{ x: 980 }}
              pagination={{
                pageSize: 25,
                showSizeChanger: true,
                showTotal: (total) => t("totalItems", { total }),
              }}
            />
          </Space>
        </Card>
      </div>
    </div>
  );
}
